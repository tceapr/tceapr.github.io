const form = document.querySelector("#ticket-form");
const builderView = document.querySelector("#builder-view");
const studentView = document.querySelector("#student-view");
const builderMessage = document.querySelector("#builder-message");
const linkPanel = document.querySelector("#link-panel");
const studentLinkInput = document.querySelector("#student-link");
const previewButton = document.querySelector("#preview-ticket");
const createLinkButton = document.querySelector("#create-link");
const clearButton = document.querySelector("#clear-form");
const copyLinkButton = document.querySelector("#copy-link");
const backToBuilderButton = document.querySelector("#back-to-builder");
const studentTitle = document.querySelector("#student-title");
const studentDirections = document.querySelector("#student-directions");
const teacherDirections = document.querySelector("#teacher-directions");
const progressPill = document.querySelector("#progress-pill");
const feedback = document.querySelector("#feedback");
const completedGroups = document.querySelector("#completed-groups");
const cardGrid = document.querySelector("#card-grid");
const submitButton = document.querySelector("#submit-group");
const completePanel = document.querySelector("#complete-panel");

const ticketParam = "ticket";
const defaultDirections = "Find three items that belong together. Select all three, then submit your group.";

let currentTicket = null;
let activeItems = [];
let selectedIds = new Set();
let solvedGroupIds = new Set();

function trimValue(value) {
  return value.trim().replace(/\s+/g, " ");
}

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.classList.toggle("is-error", type === "error");
  element.classList.toggle("is-success", type === "success");
}

function readTicketFromForm() {
  const title = trimValue(document.querySelector("#ticket-title").value);
  const directions = trimValue(document.querySelector("#ticket-directions").value);
  const groups = [];
  const messages = [];
  const seenItems = new Map();

  if (!title) {
    messages.push("Add an exit ticket title.");
  }

  for (let groupIndex = 1; groupIndex <= 3; groupIndex += 1) {
    const name = trimValue(document.querySelector(`#category-${groupIndex}-name`).value);
    const items = [];

    if (!name) {
      messages.push(`Category ${groupIndex} needs a name.`);
    }

    for (let itemIndex = 1; itemIndex <= 3; itemIndex += 1) {
      const item = trimValue(document.querySelector(`#category-${groupIndex}-item-${itemIndex}`).value);

      if (!item) {
        messages.push(`Category ${groupIndex}, item ${itemIndex} is missing.`);
      }

      const itemKey = item.toLocaleLowerCase();
      if (item && seenItems.has(itemKey)) {
        messages.push(`Each item should be unique. Check "${item}".`);
      }
      if (item) {
        seenItems.set(itemKey, true);
      }

      items.push(item);
    }

    groups.push({
      id: `group-${groupIndex}`,
      name,
      items,
    });
  }

  return {
    data: {
      v: 1,
      title,
      directions,
      groups,
    },
    messages,
  };
}

function validateTicketData(data) {
  const messages = [];

  if (!data || data.v !== 1 || !Array.isArray(data.groups) || data.groups.length !== 3) {
    return {
      data: null,
      messages: ["This student link does not contain a valid 3x3 exit ticket."],
    };
  }

  const title = trimValue(String(data.title || ""));
  const directions = trimValue(String(data.directions || ""));
  const groups = [];
  const seenItems = new Map();

  if (!title) {
    messages.push("This exit ticket needs a title.");
  }

  data.groups.forEach((group, groupIndex) => {
    const name = trimValue(String(group?.name || ""));
    const sourceItems = Array.isArray(group?.items) ? group.items : [];
    const items = sourceItems.map((item) => trimValue(String(item || "")));

    if (!name) {
      messages.push(`Category ${groupIndex + 1} needs a name.`);
    }

    if (items.length !== 3) {
      messages.push(`Category ${groupIndex + 1} needs exactly 3 items.`);
    }

    for (let itemIndex = 0; itemIndex < 3; itemIndex += 1) {
      if (!items[itemIndex]) {
        messages.push(`Category ${groupIndex + 1}, item ${itemIndex + 1} is missing.`);
      }

      const itemKey = items[itemIndex]?.toLocaleLowerCase();
      if (itemKey && seenItems.has(itemKey)) {
        messages.push(`Each item should be unique. Check "${items[itemIndex]}".`);
      }
      if (itemKey) {
        seenItems.set(itemKey, true);
      }
    }

    groups.push({
      id: `group-${groupIndex + 1}`,
      name,
      items,
    });
  });

  return {
    data: {
      v: 1,
      title,
      directions,
      groups,
    },
    messages,
  };
}

function encodeTicket(ticket) {
  const json = JSON.stringify({
    v: 1,
    title: ticket.title,
    directions: ticket.directions,
    groups: ticket.groups.map((group) => ({
      name: group.name,
      items: group.items,
    })),
  });
  const bytes = new TextEncoder().encode(json);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeTicket(encoded) {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    const validation = validateTicketData(parsed);

    if (validation.messages.length) {
      throw new Error(validation.messages[0]);
    }

    return validation.data;
  } catch {
    return null;
  }
}

function makeStudentUrl(ticket) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set(ticketParam, encodeTicket(ticket));
  return url.toString();
}

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed || 1;
  return function random() {
    value = Math.imul(1664525, value) + 1013904223;
    return (value >>> 0) / 4294967296;
  };
}

function getShuffledItems(ticket) {
  const encoded = encodeTicket(ticket);
  const random = seededRandom(hashString(encoded));
  const items = ticket.groups.flatMap((group) =>
    group.items.map((label, itemIndex) => ({
      id: `${group.id}-item-${itemIndex + 1}`,
      groupId: group.id,
      label,
    })),
  );
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const originalOrder = items.map((item) => item.id).join("|");
  const shuffledOrder = shuffled.map((item) => item.id).join("|");

  if (originalOrder === shuffledOrder) {
    [shuffled[0], shuffled[4]] = [shuffled[4], shuffled[0]];
  }

  return shuffled;
}

function startTicket(ticket, options = {}) {
  currentTicket = ticket;
  activeItems = getShuffledItems(ticket);
  selectedIds = new Set();
  solvedGroupIds = new Set();

  document.body.classList.toggle("student-mode", !options.preview);
  builderView.hidden = !options.preview;
  studentView.hidden = false;
  backToBuilderButton.hidden = !options.preview;
  completePanel.hidden = true;
  document.querySelector("#reflection").value = "";

  studentTitle.textContent = ticket.title;
  studentDirections.textContent = defaultDirections;
  teacherDirections.textContent = ticket.directions;
  teacherDirections.hidden = !ticket.directions;

  setMessage(feedback, "Select three cards to make a group.");
  renderStudentState();
  studentView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderStudentState() {
  renderCompletedGroups();
  renderCards();
  updateControls();
}

function renderCompletedGroups() {
  completedGroups.replaceChildren();

  currentTicket.groups
    .filter((group) => solvedGroupIds.has(group.id))
    .forEach((group) => {
      const groupElement = document.createElement("div");
      const groupTitle = document.createElement("strong");
      const groupItems = document.createElement("span");

      groupElement.className = "completed-group";
      groupTitle.textContent = group.name;
      groupItems.textContent = group.items.join(", ");

      groupElement.append(groupTitle, groupItems);
      completedGroups.append(groupElement);
    });
}

function renderCards() {
  cardGrid.replaceChildren();

  activeItems
    .filter((item) => !solvedGroupIds.has(item.groupId))
    .forEach((item) => {
      const button = document.createElement("button");
      const isSelected = selectedIds.has(item.id);

      button.type = "button";
      button.className = "item-card";
      button.textContent = item.label;
      button.setAttribute("aria-pressed", String(isSelected));
      button.setAttribute("aria-label", `${isSelected ? "Deselect" : "Select"} ${item.label}`);
      button.addEventListener("click", () => toggleItem(item.id));

      cardGrid.append(button);
    });
}

function updateControls() {
  progressPill.textContent = `${solvedGroupIds.size} of 3 groups found`;
  submitButton.disabled = selectedIds.size !== 3 || solvedGroupIds.size === 3;
  cardGrid.hidden = solvedGroupIds.size === 3;
  completePanel.hidden = solvedGroupIds.size !== 3;

  if (solvedGroupIds.size === 3) {
    setMessage(feedback, "Exit Ticket Complete!", "success");
  }
}

function toggleItem(itemId) {
  if (selectedIds.has(itemId)) {
    selectedIds.delete(itemId);
    setMessage(feedback, selectedIds.size ? `${selectedIds.size} selected.` : "Select three cards to make a group.");
    renderStudentState();
    return;
  }

  if (selectedIds.size >= 3) {
    setMessage(feedback, "You can select exactly three cards. Deselect one to change your group.", "error");
    return;
  }

  selectedIds.add(itemId);
  setMessage(feedback, selectedIds.size === 3 ? "Ready to submit your group." : `${selectedIds.size} selected.`);
  renderStudentState();
}

function submitSelectedGroup() {
  if (selectedIds.size !== 3) {
    setMessage(feedback, "Select exactly three cards before submitting.", "error");
    return;
  }

  const selectedItems = activeItems.filter((item) => selectedIds.has(item.id));
  const groupId = selectedItems[0]?.groupId;
  const isCorrect = selectedItems.every((item) => item.groupId === groupId) && !solvedGroupIds.has(groupId);

  if (!isCorrect) {
    selectedIds = new Set();
    setMessage(feedback, "Not quite. Try another combination.", "error");
    renderStudentState();
    return;
  }

  solvedGroupIds.add(groupId);
  selectedIds = new Set();

  const solvedGroup = currentTicket.groups.find((group) => group.id === groupId);
  setMessage(feedback, `${solvedGroup.name} is correct.`, "success");
  renderStudentState();
}

function handlePreview() {
  const validation = readTicketFromForm();

  if (validation.messages.length) {
    setMessage(builderMessage, validation.messages[0], "error");
    return;
  }

  setMessage(builderMessage, "Preview ready.", "success");
  startTicket(validation.data, { preview: true });
}

function handleCreateLink() {
  const validation = readTicketFromForm();

  if (validation.messages.length) {
    setMessage(builderMessage, validation.messages[0], "error");
    return;
  }

  studentLinkInput.value = makeStudentUrl(validation.data);
  linkPanel.hidden = false;
  setMessage(builderMessage, "Student link created. Use Copy Link when you are ready to share it.", "success");
}

async function handleCopyLink() {
  const link = studentLinkInput.value;

  if (!link) {
    return;
  }

  try {
    await navigator.clipboard.writeText(link);
    setMessage(builderMessage, "Student link copied.", "success");
  } catch {
    studentLinkInput.select();
    document.execCommand("copy");
    setMessage(builderMessage, "Student link copied.", "success");
  }
}

function clearForm() {
  form.reset();
  linkPanel.hidden = true;
  studentLinkInput.value = "";
  studentView.hidden = true;
  document.body.classList.remove("student-mode");
  setMessage(builderMessage, "");
}

function loadTicketFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encodedTicket = params.get(ticketParam);

  if (!encodedTicket) {
    return;
  }

  const ticket = decodeTicket(encodedTicket);
  if (!ticket) {
    setMessage(builderMessage, "This student link could not be opened. Please ask your teacher for a new link.", "error");
    return;
  }

  startTicket(ticket, { preview: false });
}

previewButton.addEventListener("click", handlePreview);
createLinkButton.addEventListener("click", handleCreateLink);
clearButton.addEventListener("click", clearForm);
copyLinkButton.addEventListener("click", handleCopyLink);
submitButton.addEventListener("click", submitSelectedGroup);
backToBuilderButton.addEventListener("click", () => {
  studentView.hidden = true;
  document.body.classList.remove("student-mode");
  setMessage(feedback, "");
  builderView.scrollIntoView({ behavior: "smooth", block: "start" });
});

loadTicketFromUrl();
