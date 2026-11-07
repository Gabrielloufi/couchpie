// Closes a tab when Back has nowhere to go in it (see goBack in nav.js): a tab a link
// opened, such as a help page. The kiosk's first tab, the service itself, stays.
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message !== "close-tab" || !sender.tab) return false;
  chrome.tabs.query({}).then((tabs) => {
    const first = Math.min(...tabs.map((tab) => tab.id));
    if (tabs.length > 1 && sender.tab.id !== first) {
      reply(true);
      chrome.tabs.remove(sender.tab.id);
    } else {
      reply(false);
    }
  });
  return true;  // the reply comes later
});
