const title = document.querySelector("[data-thank-you-title]");
const name = String(
  sessionStorage.getItem("autokonceptLeadName") || "",
).trim();

if (title && name) {
  title.textContent = `Спасибо, ${name}!`;
}

sessionStorage.removeItem("autokonceptLeadName");
