export function stripParam(searchParams: URLSearchParams, param: string) {
  if (searchParams.has(param)) {
    searchParams.delete(param);
  }
}

export function stripParams(searchParams: URLSearchParams, params: string[]) {
  for (const param of params) {
    stripParam(searchParams, param);
  }
}

export function stripStripeParams(searchParams: URLSearchParams) {
  return stripParams(searchParams, [
    'payment_intent_client_secret',
    'redirect_status',
    'payment_intent'
  ]);
}
