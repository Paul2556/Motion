// Starter content for the admin panel's Announcements compose form
// (src/pages/AdminPanelPage.jsx) - purely UI prefill, edited freely before
// sending. Not read server-side.
export const ANNOUNCEMENT_TEMPLATES = [
  { id: "blank", label: "Blank", subject: "", body: "" },
  {
    id: "live",
    label: "We're live",
    subject: "Motion is open, come try it out",
    body: `Hi,

Thanks for waiting - Motion is now open. You can create a free account and run your next committee session with it.

Try it here: https://app.motionmun.com`,
  },
  {
    id: "update",
    label: "Product update",
    subject: "What's new with Motion",
    body: `Hi,

A quick update on what's shipped recently in Motion.

- [new feature or improvement]
- [new feature or improvement]

Take a look: https://app.motionmun.com`,
  },
  {
    id: "reminder",
    label: "Event reminder",
    subject: "Reminder: [conference/event name]",
    body: `Hi,

Just a reminder about [conference/event name] on [date]. Here's what you need to know:

- [detail]
- [detail]`,
  },
];
