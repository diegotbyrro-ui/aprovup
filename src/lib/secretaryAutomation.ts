import {
  syncSecretaryApprovalAlerts,
  syncSecretaryPublicationAlerts,
} from '@/lib/secretaryMonitor';

import {
  deliverSecretaryAlertsToWhatsapp,
  deliverSecretaryCalendarReminders,
  deliverSecretaryCaptureReminders,
  deliverSecretaryDailyBriefs,
  deliverSecretaryProductionDeadlineReminders,
  processPendingWhatsappEvents,
} from '@/lib/secretaryWhatsApp';


export async function runSecretaryAutomation() {
  const whatsappInbound =
    await processPendingWhatsappEvents(
      10
    )
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY WHATSAPP INBOUND ERROR',
            error
          );

          return 0;
        }
      );


  const publications =
    await syncSecretaryPublicationAlerts()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY PUBLICATION MONITOR ERROR',
            error
          );

          return null;
        }
      );


  const approvals =
    await syncSecretaryApprovalAlerts()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY APPROVAL MONITOR ERROR',
            error
          );

          return null;
        }
      );


  const alertDeliveries =
    await deliverSecretaryAlertsToWhatsapp()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY WHATSAPP DELIVERY ERROR',
            error
          );

          return 0;
        }
      );


  const calendarReminders =
    await deliverSecretaryCalendarReminders()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY CALENDAR REMINDER ERROR',
            error
          );

          return 0;
        }
      );


  const captureReminders =
    await deliverSecretaryCaptureReminders()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY CAPTURE REMINDER ERROR',
            error
          );

          return 0;
        }
      );


  const productionDeadlines =
    await deliverSecretaryProductionDeadlineReminders()
      .catch(
        (error) => {
          console.error(
            'SECRETARY PRODUCTION DEADLINE ERROR',
            error
          );

          return 0;
        }
      );


  const dailyBriefs =
    await deliverSecretaryDailyBriefs()
      .catch(
        (
          error
        ) => {
          console.error(
            'SECRETARY DAILY BRIEF ERROR',
            error
          );

          return 0;
        }
      );


  return {
    whatsappInbound,
    publications,
    approvals,
    alertDeliveries,
    calendarReminders,
    captureReminders,
    productionDeadlines,
    dailyBriefs,
  };
}
