import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWz4W3OfUjXwlkO6dkPud5m4M0GZ1I4xs",
  authDomain: "groupix-af7e2.firebaseapp.com",
  projectId: "groupix-af7e2",
  storageBucket: "groupix-af7e2.firebasestorage.app",
  messagingSenderId: "246822951290",
  appId: "1:246822951290:web:14c1a8047138dc34cc5ec3",
  measurementId: "G-RMTZ2BNKVJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM References
const customFieldsList = document.getElementById('customFieldsList');
const addCustomFieldBtn = document.getElementById('addCustomFieldBtn');
const createFormElement = document.getElementById('createForm');
const allFormsGrid = document.getElementById('allFormsGrid');
const recentFormsList = document.getElementById('recentFormsList');
const createFormNavBtn = document.getElementById('createFormNavBtn');
const clickableAdminBadge = document.getElementById('clickableAdminBadge');

// Mobile Hamburger Navigation DOM
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// Settings Forms
const updateNameForm = document.getElementById('updateNameForm');
const updateEmailForm = document.getElementById('updateEmailForm');

// Statistics Elements
const totalFormsCount = document.getElementById('totalFormsCount');
const totalResponsesCount = document.getElementById('totalResponsesCount');
const activeFormsCount = document.getElementById('activeFormsCount');

// VIEW 4: RESPONSES MANAGEMENT DOM REFERENCES
const responseFormSelect = document.getElementById('responseFormSelect');
const responseSearchInput = document.getElementById('responseSearchInput');
const responseSortSelect = document.getElementById('responseSortSelect');
const includeDateInPrint = document.getElementById('includeDateInPrint');
const btnAddStudentResponse = document.getElementById('btnAddStudentResponse');
const btnPrintResponses = document.getElementById('btnPrintResponses');

const responsesStatsCard = document.getElementById('responsesStatsCard');
const respStatTotal = document.getElementById('respStatTotal');
const respStatFormName = document.getElementById('respStatFormName');
const respTableHead = document.getElementById('respTableHead');
const respTableBody = document.getElementById('respTableBody');

// Modal Elements
const studentResponseModal = document.getElementById('studentResponseModal');
const responseModalTitle = document.getElementById('responseModalTitle');
const dynamicResponseFields = document.getElementById('dynamicResponseFields');
const studentResponseForm = document.getElementById('studentResponseForm');
const btnCloseResponseModal = document.getElementById('btnCloseResponseModal');
const btnCancelResponseModal = document.getElementById('btnCancelResponseModal');

let editingFormId = null;
let unsubscribeForms = null;

// Global state for Responses View
let currentAdminForms = [];
let currentSelectedFormId = null;
let activeFormSchema = null;
let rawResponsesList = [];
let processedResponsesList = [];
let editingResponseId = null;

// --- MOBILE SIDEBAR / MENU CONTROLLER ---
hamburgerBtn?.addEventListener('click', () => {
  sidebar?.classList.toggle('active');
  overlay?.classList.toggle('active');
});

overlay?.addEventListener('click', () => {
  sidebar?.classList.remove('active');
  overlay?.classList.remove('active');
});

// --- NAVIGATION HELPER ---
function navigateToView(viewId) {
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  viewSections.forEach(section => {
    if (section.id === viewId) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });

  navItems.forEach(item => {
    if (item.getAttribute('data-target') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  sidebar?.classList.remove('active');
  overlay?.classList.remove('active');

  // Trigger Responses initialization if switching to responsesView
  if (viewId === 'responsesView') {
    populateResponsesDropdown();
  }
}

// Clickable Profile Avatar
clickableAdminBadge?.addEventListener('click', () => {
  navigateToView('settingsView');
});

// Auth State Check & Profile Population
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const adminName = user.displayName || "Admin User";

    if (document.getElementById('adminGreeting')) {
      document.getElementById('adminGreeting').innerText = `Hello ${adminName}`;
    }
    if (document.getElementById('adminNameDisplay')) {
      document.getElementById('adminNameDisplay').innerText = `Hello ${adminName}`;
    }
    if (document.getElementById('adminAvatar')) {
      document.getElementById('adminAvatar').innerText = adminName.charAt(0).toUpperCase();
    }

    if (document.getElementById('settingsFullName')) {
      document.getElementById('settingsFullName').value = user.displayName || "";
    }
    if (document.getElementById('settingsEmail')) {
      document.getElementById('settingsEmail').value = user.email || "";
    }

    loadAdminForms(user.uid);
  } else {
    window.location.href = "index.html";
  }
});

// Toggle Password Visibility Eye Icons
document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', () => {
    const targetId = icon.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
  });
});

// 1. UPDATE NAME HANDLER
updateNameForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user || !user.email) {
    alert("User session not found. Please log in again.");
    return;
  }

  const newName = document.getElementById('settingsFullName').value.trim();
  const password = document.getElementById('nameConfirmPassword').value;

  if (!password) {
    alert("Please enter your current password.");
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    await updateProfile(user, { displayName: newName });

    if (document.getElementById('adminGreeting')) document.getElementById('adminGreeting').innerText = `Hello ${newName}`;
    if (document.getElementById('adminNameDisplay')) document.getElementById('adminNameDisplay').innerText = `Hello ${newName}`;
    if (document.getElementById('adminAvatar')) document.getElementById('adminAvatar').innerText = newName.charAt(0).toUpperCase();

    document.getElementById('nameConfirmPassword').value = '';
    alert("Profile Name updated successfully!");

  } catch (error) {
    if (
      error.code === 'auth/invalid-credential' || 
      error.code === 'auth/wrong-password' || 
      error.code === 'auth/invalid-password'
    ) {
      alert("Incorrect password. Please enter your correct current password.");
    } else {
      alert("Failed to update name: " + error.message);
    }
  }
});

// 2. UPDATE EMAIL HANDLER (USING VERIFY BEFORE UPDATE)
updateEmailForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user || !user.email) {
    alert("User session not found. Please log in again.");
    return;
  }

  const newEmail = document.getElementById('settingsEmail').value.trim();
  const password = document.getElementById('emailConfirmPassword').value;

  if (!password) {
    alert("Please enter your current password.");
    return;
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    await verifyBeforeUpdateEmail(user, newEmail);

    document.getElementById('emailConfirmPassword').value = '';
    alert(`A verification email has been sent to ${newEmail}. Please check your inbox and click the link to finalize your email update.`);

  } catch (error) {
    if (
      error.code === 'auth/invalid-credential' || 
      error.code === 'auth/wrong-password' || 
      error.code === 'auth/invalid-password'
    ) {
      alert("Incorrect password. Please enter your correct current password.");
    } else {
      alert("Failed to update email: " + error.message);
    }
  }
});

// Logout Handler
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  if (unsubscribeForms) unsubscribeForms();
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

// Theme Switcher
const htmlElem = document.documentElement;
const themeToggleBtnDesktop = document.getElementById('themeToggleBtnDesktop');
const themeToggleBtnMobile = document.getElementById('themeToggleBtnMobile');

function setTheme(theme) {
  htmlElem.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

const currentTheme = localStorage.getItem('theme') || 'light';
setTheme(currentTheme);

[themeToggleBtnDesktop, themeToggleBtnMobile].forEach(btn => {
  btn?.addEventListener('click', () => {
    const newTheme = htmlElem.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  });
});

// Navigation Handlers
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = item.getAttribute('data-target');
    if (target === 'createFormView' && !editingFormId) {
      resetFormBuilder();
    }
    navigateToView(target);
  });
});

document.getElementById('quickCreateBtn')?.addEventListener('click', () => {
  resetFormBuilder();
  navigateToView('createFormView');
});

createFormNavBtn?.addEventListener('click', () => {
  resetFormBuilder();
  navigateToView('createFormView');
});

// Dynamic Custom Fields Builder
let customFieldsCount = 0;

addCustomFieldBtn?.addEventListener('click', () => {
  addCustomFieldRow();
});

function addCustomFieldRow(name = '', isRequired = false) {
  customFieldsCount++;
  const fieldRow = document.createElement('div');
  fieldRow.className = 'custom-field-row';
  fieldRow.id = `customField_${customFieldsCount}`;

  fieldRow.innerHTML = `
    <input type="text" class="custom-field-name" placeholder="Field Name (e.g. Bank Address, Next of Kin)" value="${name}" required>
    <label class="custom-checkbox">
      <input type="checkbox" class="custom-field-required" ${isRequired ? 'checked' : ''}> Required
    </label>
    <button type="button" class="btn-danger-icon remove-custom-field" data-id="customField_${customFieldsCount}">
      <i class="fa-solid fa-trash"></i>
    </button>
  `;

  customFieldsList.appendChild(fieldRow);

  fieldRow.querySelector('.remove-custom-field').addEventListener('click', (e) => {
    const targetId = e.currentTarget.getAttribute('data-id');
    document.getElementById(targetId)?.remove();
  });
}

function resetFormBuilder() {
  editingFormId = null;
  createFormElement.reset();
  if (customFieldsList) customFieldsList.innerHTML = "";
  const submitBtn = createFormElement.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Form';
}

// Create or Update Form Handler
createFormElement?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const title = document.getElementById('formTitle').value.trim();
  const description = document.getElementById('formDescription').value.trim();
  const deadlineVal = document.getElementById('formDeadline').value;
  const limitVal = document.getElementById('responseLimit').value;

  const selectedDefaultFields = [];
  document.querySelectorAll('input[name="defaultFields"]:checked').forEach(checkbox => {
    selectedDefaultFields.push(checkbox.value);
  });

  const customFields = [];
  document.querySelectorAll('.custom-field-row').forEach(row => {
    const fieldName = row.querySelector('.custom-field-name').value.trim();
    const isRequired = row.querySelector('.custom-field-required').checked;
    if (fieldName) {
      customFields.push({ name: fieldName, isRequired });
    }
  });

  const formData = {
    adminId: currentUser.uid,
    title: title,
    description: description,
    defaultFields: selectedDefaultFields,
    customFields: customFields,
    deadline: deadlineVal ? new Date(deadlineVal) : null,
    responseLimit: limitVal ? parseInt(limitVal) : null,
    updatedAt: serverTimestamp()
  };

  try {
    if (editingFormId) {
      await updateDoc(doc(db, "forms", editingFormId), formData);
      alert("Form updated successfully!");
    } else {
      formData.status = "active";
      formData.createdAt = serverTimestamp();
      await addDoc(collection(db, "forms"), formData);
      alert("Form created successfully!");
    }

    resetFormBuilder();
    navigateToView('formsView');

  } catch (error) {
    console.error("Firestore Error:", error);
    alert("Failed to save form: " + error.message);
  }
});

// Load Forms and Calculate Statistics
function loadAdminForms(adminUid) {
  if (unsubscribeForms) unsubscribeForms();

  const q = query(collection(db, "forms"), where("adminId", "==", adminUid));

  unsubscribeForms = onSnapshot(q, async (snapshot) => {
    const totalForms = snapshot.size;
    let activeForms = 0;
    let totalResponses = 0;

    const formsList = [];

    for (const docSnap of snapshot.docs) {
      const form = docSnap.data();
      const formId = docSnap.id;

      if (form.status === 'active') activeForms++;

      try {
        const respSnap = await getDocs(collection(db, "forms", formId, "responses"));
        totalResponses += respSnap.size;
      } catch (e) {
        try {
          const respSnapFlat = await getDocs(query(collection(db, "responses"), where("formId", "==", formId)));
          totalResponses += respSnapFlat.size;
        } catch (err) {}
      }

      formsList.push({ id: formId, ...form });
    }

    currentAdminForms = formsList; // Cache user forms locally

    if (totalFormsCount) totalFormsCount.innerText = totalForms;
    if (activeFormsCount) activeFormsCount.innerText = activeForms;
    if (totalResponsesCount) totalResponsesCount.innerText = totalResponses;

    renderFormsToGrid(formsList, allFormsGrid);
    renderFormsToGrid(formsList, recentFormsList);

    // Refresh response dropdown if on responses view
    populateResponsesDropdown();

  }, (err) => {
    console.error("Snapshot error:", err);
  });
}

function renderFormsToGrid(formsList, gridContainer) {
  if (!gridContainer) return;

  if (formsList.length === 0) {
    gridContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <p>No forms created yet. Click "Create Form" to get started.</p>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = "";

  formsList.forEach((form) => {
    const formId = form.id;
    const deadlineDate = form.deadline?.toDate ? form.deadline.toDate().toLocaleString() : "No deadline";

    const card = document.createElement('div');
    card.className = 'form-card';
    card.innerHTML = `
      <div>
        <div class="form-card-header">
          <h3>${form.title}</h3>
          <span class="status-badge ${form.status === 'active' ? 'status-active' : 'status-locked'}">
            ${form.status}
          </span>
        </div>
        <div class="form-card-body">
          <p>${form.description}</p>
          <div class="form-card-meta">
            <span><i class="fa-regular fa-clock"></i> <strong>Deadline:</strong> ${deadlineDate}</span>
            <span><i class="fa-solid fa-users"></i> <strong>Limit:</strong> ${form.responseLimit || 'Unlimited'}</span>
          </div>
        </div>
      </div>

      <div class="form-card-actions">
        <button class="btn-card-action copy-btn" data-link="${window.location.origin}/form.html?id=${formId}">
          <i class="fa-regular fa-copy"></i> Copy Link
        </button>
        <button class="btn-card-action edit-btn" data-id="${formId}">
          <i class="fa-solid fa-pen-to-square"></i> Edit
        </button>
        <button class="btn-card-action toggle-status-btn" data-id="${formId}" data-status="${form.status}">
          <i class="fa-solid ${form.status === 'active' ? 'fa-lock' : 'fa-lock-open'}"></i>
          ${form.status === 'active' ? 'Lock' : 'Unlock'}
        </button>
        <button class="btn-card-action danger delete-btn" data-id="${formId}">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </div>
    `;

    card.dataset.formData = JSON.stringify(form);
    gridContainer.appendChild(card);
  });

  attachCardEvents();
}

function attachCardEvents() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const link = e.currentTarget.getAttribute('data-link');
      navigator.clipboard.writeText(link);
      alert("Form submission link copied to clipboard!");
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const formCard = e.currentTarget.closest('.form-card');
      const formId = e.currentTarget.getAttribute('data-id');
      const formData = JSON.parse(formCard.dataset.formData);

      editingFormId = formId;

      document.getElementById('formTitle').value = formData.title || '';
      document.getElementById('formDescription').value = formData.description || '';
      document.getElementById('responseLimit').value = formData.responseLimit || '';

      if (formData.deadline?.seconds) {
        const d = new Date(formData.deadline.seconds * 1000);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        document.getElementById('formDeadline').value = d.toISOString().slice(0, 16);
      }

      document.querySelectorAll('input[name="defaultFields"]').forEach(checkbox => {
        checkbox.checked = formData.defaultFields ? formData.defaultFields.includes(checkbox.value) : false;
      });

      if (customFieldsList) customFieldsList.innerHTML = "";
      if (formData.customFields) {
        formData.customFields.forEach(cf => addCustomFieldRow(cf.name, cf.isRequired));
      }

      const submitBtn = createFormElement.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';

      navigateToView('createFormView');
    });
  });

  document.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const currentStatus = e.currentTarget.getAttribute('data-status');
      const newStatus = currentStatus === 'active' ? 'locked' : 'active';

      try {
        await updateDoc(doc(db, "forms", id), { status: newStatus });
      } catch (err) {
        alert("Error updating status: " + err.message);
      }
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm("Are you sure you want to delete this form?")) {
        try {
          await deleteDoc(doc(db, "forms", id));
        } catch (err) {
          alert("Error deleting form: " + err.message);
        }
      }
    });
  });
}

// ==========================================
// VIEW 4: RESPONSES MANAGEMENT CONTROLLER
// ==========================================

function populateResponsesDropdown() {
  if (!responseFormSelect) return;
  const prevVal = responseFormSelect.value;
  responseFormSelect.innerHTML = '<option value="">-- Select Form --</option>';

  currentAdminForms.forEach(form => {
    const opt = document.createElement('option');
    opt.value = form.id;
    opt.textContent = form.title || "Untitled Form";
    if (form.id === prevVal) opt.selected = true;
    responseFormSelect.appendChild(opt);
  });
}

responseFormSelect?.addEventListener('change', async (e) => {
  currentSelectedFormId = e.target.value;

  if (!currentSelectedFormId) {
    resetResponsesView();
    return;
  }

  respTableBody.innerHTML = `<tr><td style="padding: 30px; text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading responses...</td></tr>`;

  try {
    const formDoc = await getDoc(doc(db, "forms", currentSelectedFormId));
    if (!formDoc.exists()) return;
    activeFormSchema = formDoc.data();

    document.getElementById('printFormTitle').innerText = activeFormSchema.title || "Student Responses";
    document.getElementById('printFormDesc').innerText = activeFormSchema.description || "";

    const respSnap = await getDocs(collection(db, "forms", currentSelectedFormId, "responses"));
    rawResponsesList = respSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    responseSearchInput.disabled = false;
    responseSortSelect.disabled = false;
    btnAddStudentResponse.disabled = false;
    btnPrintResponses.disabled = false;
    responsesStatsCard.classList.remove('hidden');

    respStatFormName.innerText = activeFormSchema.title;

    applyFiltersAndRender();

  } catch (error) {
    console.error("Error loading responses:", error);
    respTableBody.innerHTML = `<tr><td style="padding: 20px; text-align: center; color: red;">Failed to load responses: ${error.message}</td></tr>`;
  }
});

function applyFiltersAndRender() {
  let result = [...rawResponsesList];
  const searchTerm = responseSearchInput.value.toLowerCase().trim();
  const sortOption = responseSortSelect.value;

  if (searchTerm) {
    result = result.filter(resp => {
      const defVals = Object.values(resp.defaultResponses || {}).join(' ').toLowerCase();
      const custVals = Object.values(resp.customResponses || {}).join(' ').toLowerCase();
      return defVals.includes(searchTerm) || custVals.includes(searchTerm);
    });
  }

  result.sort((a, b) => {
    const tA = a.submittedAt?.seconds || 0;
    const tB = b.submittedAt?.seconds || 0;

    if (sortOption === 'oldestFirst') return tA - tB;
    if (sortOption === 'newestFirst') return tB - tA;
    if (sortOption === 'nameAsc') {
      const nameA = (a.defaultResponses?.fullName || '').toLowerCase();
      const nameB = (b.defaultResponses?.fullName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  processedResponsesList = result;
  respStatTotal.innerText = processedResponsesList.length;

  renderResponsesTable();
}

function renderResponsesTable() {
  if (!activeFormSchema) return;

  const showDate = includeDateInPrint.checked;

  let headHtml = `<tr><th style="width: 50px;">#</th>`;
  if (showDate) headHtml += `<th class="date-col">Date Submitted</th>`;

  if (activeFormSchema.defaultFields) {
    activeFormSchema.defaultFields.forEach(field => {
      const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      headHtml += `<th>${label}</th>`;
    });
  }

  if (activeFormSchema.customFields) {
    activeFormSchema.customFields.forEach(cf => headHtml += `<th>${cf.name}</th>`);
  }

  headHtml += `<th class="action-col no-print" style="text-align: center;">Actions</th></tr>`;
  respTableHead.innerHTML = headHtml;

  if (processedResponsesList.length === 0) {
    respTableBody.innerHTML = `<tr><td colspan="10" style="padding: 30px; text-align: center; color: var(--text-muted);">No student entries found.</td></tr>`;
    return;
  }

  respTableBody.innerHTML = processedResponsesList.map((resp, idx) => {
    const serialNum = idx + 1;
    const dateStr = resp.submittedAt?.toDate ? resp.submittedAt.toDate().toLocaleString() : 'Manual Entry';

    let rowHtml = `<tr><td><strong>${serialNum}</strong></td>`;
    if (showDate) rowHtml += `<td class="date-col">${dateStr}</td>`;

    if (activeFormSchema.defaultFields) {
      activeFormSchema.defaultFields.forEach(f => {
        const val = resp.defaultResponses?.[f] || '-';
        rowHtml += `<td>${val}</td>`;
      });
    }

    if (activeFormSchema.customFields) {
      activeFormSchema.customFields.forEach(cf => {
        const val = resp.customResponses?.[cf.name] || '-';
        rowHtml += `<td>${val}</td>`;
      });
    }

    rowHtml += `
      <td class="action-col no-print" style="text-align: center;">
        <button class="btn-card-action edit-resp-btn" data-id="${resp.id}" title="Edit Student Info"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-card-action danger delete-resp-btn" data-id="${resp.id}" title="Remove Student"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;

    return rowHtml;
  }).join('');

  attachTableActionEvents();
}

function attachTableActionEvents() {
  document.querySelectorAll('.edit-resp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const item = rawResponsesList.find(r => r.id === id);
      if (item) openResponseModal(item);
    });
  });

  document.querySelectorAll('.delete-resp-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm("Are you sure you want to remove this student entry?")) {
        try {
          await deleteDoc(doc(db, "forms", currentSelectedFormId, "responses", id));
          rawResponsesList = rawResponsesList.filter(r => r.id !== id);
          applyFiltersAndRender();
        } catch (err) {
          alert("Error deleting record: " + err.message);
        }
      }
    });
  });
}

function openResponseModal(data = null) {
  editingResponseId = data ? data.id : null;
  responseModalTitle.innerHTML = editingResponseId 
    ? '<i class="fa-solid fa-user-pen"></i> Edit Student Information' 
    : '<i class="fa-solid fa-user-plus"></i> Add Student Response Manually';

  dynamicResponseFields.innerHTML = "";

  if (activeFormSchema.defaultFields) {
    activeFormSchema.defaultFields.forEach(f => {
      const label = f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      const val = data?.defaultResponses?.[f] || '';
      
      const grp = document.createElement('div');
      grp.className = 'input-group';
      grp.style.marginBottom = '12px';
      grp.innerHTML = `
        <label style="display:block; font-size:0.85rem; margin-bottom:4px;">${label}</label>
        <input type="text" data-type="default" data-key="${f}" value="${val}" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border-color); background:var(--card-bg); color:var(--text-main);" required>
      `;
      dynamicResponseFields.appendChild(grp);
    });
  }

  if (activeFormSchema.customFields) {
    activeFormSchema.customFields.forEach(cf => {
      const val = data?.customResponses?.[cf.name] || '';
      
      const grp = document.createElement('div');
      grp.className = 'input-group';
      grp.style.marginBottom = '12px';
      grp.innerHTML = `
        <label style="display:block; font-size:0.85rem; margin-bottom:4px;">${cf.name}</label>
        <input type="text" data-type="custom" data-key="${cf.name}" value="${val}" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border-color); background:var(--card-bg); color:var(--text-main);" ${cf.isRequired ? 'required' : ''}>
      `;
      dynamicResponseFields.appendChild(grp);
    });
  }

  studentResponseModal.classList.remove('hidden');
}

studentResponseForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const defaultResponses = {};
  const customResponses = {};

  dynamicResponseFields.querySelectorAll('input').forEach(input => {
    const type = input.getAttribute('data-type');
    const key = input.getAttribute('data-key');
    if (type === 'default') defaultResponses[key] = input.value.trim();
    if (type === 'custom') customResponses[key] = input.value.trim();
  });

  const payload = {
    defaultResponses,
    customResponses,
    submittedAt: editingResponseId ? (rawResponsesList.find(r => r.id === editingResponseId)?.submittedAt || new Date()) : new Date()
  };

  try {
    if (editingResponseId) {
      await updateDoc(doc(db, "forms", currentSelectedFormId, "responses", editingResponseId), payload);
      const idx = rawResponsesList.findIndex(r => r.id === editingResponseId);
      if (idx !== -1) rawResponsesList[idx] = { id: editingResponseId, ...payload };
    } else {
      const docRef = await addDoc(collection(db, "forms", currentSelectedFormId, "responses"), payload);
      rawResponsesList.push({ id: docRef.id, ...payload });
    }

    studentResponseModal.classList.add('hidden');
    applyFiltersAndRender();
  } catch (err) {
    alert("Error saving record: " + err.message);
  }
});

responseSearchInput?.addEventListener('input', applyFiltersAndRender);
responseSortSelect?.addEventListener('change', applyFiltersAndRender);
includeDateInPrint?.addEventListener('change', renderResponsesTable);

btnAddStudentResponse?.addEventListener('click', () => openResponseModal());
btnCloseResponseModal?.addEventListener('click', () => studentResponseModal.classList.add('hidden'));
btnCancelResponseModal?.addEventListener('click', () => studentResponseModal.classList.add('hidden'));

btnPrintResponses?.addEventListener('click', () => window.print());

function resetResponsesView() {
  responseSearchInput.disabled = true;
  responseSortSelect.disabled = true;
  btnAddStudentResponse.disabled = true;
  btnPrintResponses.disabled = true;
  responsesStatsCard.classList.add('hidden');
  respTableHead.innerHTML = `<tr><th>Select a form above to display responses.</th></tr>`;
  respTableBody.innerHTML = `<tr><td style="padding: 40px; text-align: center;"><i class="fa-solid fa-folder-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>No form selected.</td></tr>`;
}