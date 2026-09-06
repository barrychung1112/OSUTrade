export const requestCenterOpenEvent = "osutrade:open-request-center";
export const requestCenterVisibleEvent = "osutrade:request-visible";
export const shownRequestEventsStorageKey = "osutrade:shown-request-events";

export type RequestCenterAudience = "seller" | "buyer";

export type RequestCenterEventDetail = {
  notificationId?: string;
  requestId?: string;
  audience: RequestCenterAudience;
};

type RequestNotification = {
  id: string;
  type: string;
  requestId: string | null;
  readAt: string | null;
};

const sellerEventTypes = new Set(["request_created", "request_cancelled"]);
const buyerEventTypes = new Set([
  "request_accepted",
  "request_declined",
  "request_cancelled_by_seller",
  "request_completed",
]);

export function getActionableRequestEvent(
  notification: RequestNotification
): RequestCenterEventDetail | null {
  if (notification.readAt || !notification.requestId) return null;

  const audience = sellerEventTypes.has(notification.type)
    ? "seller"
    : buyerEventTypes.has(notification.type)
      ? "buyer"
      : null;

  if (!audience) return null;

  return {
    notificationId: notification.id,
    requestId: notification.requestId,
    audience,
  };
}

export function shouldAutoOpenRequestCenter({
  alreadyShown,
  blockingUi,
}: {
  alreadyShown: boolean;
  blockingUi: boolean;
}) {
  return !alreadyShown && !blockingUi;
}

export function openRequestCenter(detail: RequestCenterEventDetail) {
  window.dispatchEvent(
    new CustomEvent<RequestCenterEventDetail>(requestCenterOpenEvent, {
      detail,
    })
  );
}
