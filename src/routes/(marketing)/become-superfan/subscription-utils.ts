import type User from "@/lib/models/User";
import { superfanLevels } from "../_static/superfan-levels";

export const hasActiveSubscription = (user: User) => {
    return (
        typeof user.stripeSubscription === 'object' &&
        user.stripeSubscription != null &&
        user.stripeSubscription.status === 'active' &&
        user.stripeSubscription.latestInvoiceStatus === 'paid'
    );
}

export const getSubLevelFromUser = (user: User) => {
    if (hasActiveSubscription(user)) {
        // No need to load stripe, display the status instead.
        return superfanLevels.find(
            (level) => level.stripePriceId === user?.stripeSubscription?.priceId
        );
    }
}

export const getSubLevelBySlug = (slug: string) => {
    return superfanLevels.find((level) => level.id === slug);
}
