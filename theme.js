(function () {
  const themes = [
    "light-cream",
    "ocean-blue",
    "calm-gray",
    "midnight-blue",
    "deep-black",
  ];
  const theme = localStorage.getItem("inventory-theme");
  document.documentElement.dataset.theme = themes.includes(theme)
    ? theme
    : "light-cream";
})();
