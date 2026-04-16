document.addEventListener("DOMContentLoaded", () => {
  const tabs = qsa(".comparison-tab");
  const panels = qsa(".comparison-panel");

  function activatePanel(view) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.view === view;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === view;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
      panel.classList.remove("is-entering");

      if (isActive) {
        requestAnimationFrame(() => panel.classList.add("is-entering"));
      }
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activatePanel(tab.dataset.view);
    });

    tab.addEventListener("keydown", (event) => {
      const index = Array.from(tabs).indexOf(tab);
      let nextIndex = index;

      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft")
        nextIndex = (index - 1 + tabs.length) % tabs.length;

      if (nextIndex !== index) {
        event.preventDefault();
        const nextTab = tabs[nextIndex];
        activatePanel(nextTab.dataset.view);
        nextTab.focus();
      }
    });
  });

  activatePanel("strengths");
});
