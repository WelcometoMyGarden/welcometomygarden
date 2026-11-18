# Firestore indexes

There are two index definition files while we migrate from Firestore Standard to Enterprise:

| File                                 | Edition    | Status                                                         |
| ------------------------------------ | ---------- | -------------------------------------------------------------- |
| `firestore.indexes.json`             | Standard   | Live, referenced by `firebase.json`                            |
| `firestore.indexes.enterprise.json`  | Enterprise | Not referenced yet; for the new Enterprise database            |

They can't be merged into one file:

- **Standard** creates single-field indexes automatically and **rejects** composite indexes with
  only one field (+ `__name__`). It only accepts density `SPARSE_ALL`.
- **Enterprise** creates **no** indexes automatically. A query without a matching index doesn't
  fail: it runs as a full collection scan, which is slower and costs more. Every non-trivial
  query therefore needs an explicit index, single-field ones included. The default density is
  `DENSE`.

When the migration is done, point `firebase.json` at the Enterprise file (with `"edition": "enterprise"`
and the `database` ID) and delete the Standard file.

## When to add an index (Enterprise)

Only add an index when it materially reduces the number of documents scanned. These need no index:

- Document gets (`doc(...).get()`, `getDoc`, rules `get()`/`exists()`).
- Unfiltered queries on a collection or subcollection (e.g. the client listeners on
  `chats/{id}/messages`, `users-private/{uid}/trails` and `users-private/{uid}/push-registrations`).
  These are primary-key range scans under the parent document.
- Filtered queries on small per-parent subcollections, where the scan reads a handful of
  documents anyway. For example, `push-registrations where subscription != null`
  (`api/src/user/onPushRegistrationWrite.js`) and `messages orderBy createdAt` with no limit
  (`api/src/queued/sendMessageReminder.js`), which reads every message in the chat regardless.

Every index ends with an explicit `__name__ ASC`, so the definition matches whether or not the
server appends it. This also makes cursor paging (`startAt` on `__name__`) index-backed.

## Query → index map (Enterprise)

| Index                                                                 | Queries served                                                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `campsites (listed, __name__)`                                        | `src/lib/api/garden.ts` REST `runQuery` (`listed == true`, ordered and paged by `__name__`; runs on every map load), `api/src/scheduled/generateCoverage.js` |
| `chats (users CONTAINS, __name__)`                                    | `src/lib/api/chat.ts` chat observer (every logged-in session), `api/src/chat.js` recipient unread count (every message)                                 |
| `chats (users CONTAINS, createdAt, __name__)`                         | `api/src/chat.js` `checkForSpamActivity` (`createdAt >` + `users array-contains`)                                                                      |
| `users-private (relistGardenAt, __name__)`                            | `api/src/scheduled/relistGardens.js` (daily range query)                                                                                               |
| `users-private (stripeCustomerId, __name__)`                          | `api/src/subscriptions/getFirebaseUserId.js` (Stripe webhook fallback lookup)                                                                          |
| `users-private (sub.collectionMethod, sub.status, sub.cancelAt, __name__)`   | `api/src/subscriptions/handleRenewals.js` (hourly)                                                                                              |
| `users-private (sub.collectionMethod, sub.status, sub.canceledAt, __name__)` | `api/src/subscriptions/scheduled/sendFeedbackEmails.js` (hourly)                                                                                |

`sub.` = `stripeSubscription.`

When you add or change a query, update this table and the Enterprise file. After deploying, use
Query Explain (`query.explain({ analyze: true })`) to confirm the query uses an index instead of a
collection scan.
