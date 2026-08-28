const apiBase = '/api';

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 2600);
}

async function apiFetch(url, options = {}) {
  const defaultHeaders = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('mobileCareToken');
  const headers = {
    ...defaultHeaders,
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}${url}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(body?.message || 'Request failed.');
  }

  return body;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function setLoader(element, active) {
  const node = document.getElementById(element);
  if (!node) return;
  node.classList.toggle('active', active);
}

function renderStatusPill(status) {
  const statusMap = {
    'Repair Request Received': 'status-pending',
    'Diagnosis in Progress': 'status-progress',
    'Waiting for Spare Parts': 'status-pending',
    'Repair in Progress': 'status-progress',
    'Quality Testing': 'status-progress',
    'Ready for Pickup': 'status-ready',
    Delivered: 'status-delivered',
  };

  return `<span class="status-pill ${statusMap[status] || 'status-pending'}">${status}</span>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function handleHomeTrack(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const jobId = form.jobId.value.trim();

  if (!jobId) {
    showToast('Please enter your Job ID.', 'error');
    return;
  }

  try {
    const result = await apiFetch('/public/track', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    });

    window.location.href =
      `/track-repair.html?jobId=${encodeURIComponent(result.jobId || jobId)}`;

  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleTrackForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const jobId = form.jobId.value.trim();

  if (!jobId) {
    showToast('Please enter your Job ID.', 'error');
    return;
  }

  try {
    const result = await apiFetch('/public/track', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    });

    renderRepairCard(result);
    showToast('Repair details loaded.', 'success');

  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderRepairCard(data) {
  const result = document.getElementById('trackingResult');
  if (!result) return;

  result.classList.remove('hidden');
  document.getElementById('repairTitle').textContent = `${data.mobileBrand || 'Device'} Repair`;
  document.getElementById('statusBadge').textContent = data.status;
  const cssClass = (renderStatusPill(data.status).match(/status-pill (\S+)/) || [null, 'status-pending'])[1];
  document.getElementById('statusBadge').className = `status-pill ${cssClass}`;
  document.getElementById('customerName').textContent = data.customerName || 'Customer';
  document.getElementById('deviceName').textContent = `${data.mobileBrand || ''} ${data.mobileModel || ''}`.trim() || 'N/A';
  document.getElementById('jobIdValue').textContent = data.jobId || 'N/A';
  document.getElementById('imeiValue').textContent = data.imei || 'N/A';
  document.getElementById('problemText').textContent = data.problem || 'N/A';
  document.getElementById('repairCost').textContent = formatCurrency(data.repairCost || 0);
  document.getElementById('completionDate').textContent = data.expectedCompletionDate || 'Pending';

  const timeline = document.getElementById('timeline');
  if (timeline && Array.isArray(data.timeline)) {
    timeline.innerHTML = data.timeline
      .map((step) => `
        <div class="timeline-item ${step.active ? 'active' : ''} ${step.current ? 'current' : ''}">
          <span class="timeline-dot"></span>
          <div>
            <strong>${escapeHtml(step.step)}</strong>
          </div>
        </div>
      `)
      .join('');
  }
}

async function handleContactForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    message: form.message.value.trim(),
  };

  if (!payload.name || !payload.email || !payload.message) {
    showToast('Please complete all fields.', 'error');
    return;
  }

  try {
    await apiFetch('/public/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    form.reset();
    showToast('Message sent successfully.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    identifier: form.identifier.value.trim(),
    password: form.password.value.trim(),
  };

  if (!payload.identifier || !payload.password) {
    showToast('Email/username and password are required.', 'error');
    return;
  }

  try {
    const result = await apiFetch('/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    localStorage.setItem('mobileCareToken', result.token);
    localStorage.setItem('mobileCareAdmin', JSON.stringify(result.admin));
    window.location.href = '/admin.html';
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadAdminDashboard() {
  try {
    const result = await apiFetch('/admin/dashboard');
    const admin = JSON.parse(localStorage.getItem('mobileCareAdmin') || '{}');
    const userEl = document.getElementById('adminUser');
    if (userEl) userEl.textContent = admin.name || admin.username || 'Admin';

    document.getElementById('totalRepairs').textContent = result.totals?.totalRepairs ?? 0;
    document.getElementById('inProgress').textContent = result.totals?.inProgress ?? 0;
    document.getElementById('completed').textContent = result.totals?.completed ?? 0;
    document.getElementById('todaysSales').textContent = formatCurrency(result.totals?.todaysSales ?? 0);

    const recentRepairs = document.getElementById('recentRepairs');
    if (recentRepairs && Array.isArray(result.recentRepairs)) {
      recentRepairs.innerHTML = `
        <table>
          <thead>
            <tr><th>Customer</th><th>Job ID</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${result.recentRepairs.map((repair) => `
              <tr>
                <td>${escapeHtml(repair.customer_name || 'Customer')}</td>
                <td>${escapeHtml(repair.job_id || 'N/A')}</td>
                <td>${renderStatusPill(repair.status)}</td>
              </tr>
            `).join('') || '<tr><td colspan="3">No repairs found.</td></tr>'}
          </tbody>
        </table>
      `;
    }

    const lowStock = document.getElementById('lowStock');
    if (lowStock && Array.isArray(result.lowStock)) {
      lowStock.innerHTML = `
        <table>
          <thead>
            <tr><th>Item</th><th>Qty</th></tr>
          </thead>
          <tbody>
            ${result.lowStock.map((item) => `
              <tr>
                <td>${escapeHtml(item.name || 'Item')}</td>
                <td>${escapeHtml(item.quantity ?? 0)}</td>
              </tr>
            `).join('') || '<tr><td colspan="2">No low-stock items.</td></tr>'}
          </tbody>
        </table>
      `;
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function handleLogout() {
  localStorage.removeItem('mobileCareToken');
  localStorage.removeItem('mobileCareAdmin');
  window.location.href = '/admin-login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  loadShopInfo();
  const homeTrackForm = document.getElementById('homeTrackForm');
  const trackForm = document.getElementById('trackForm');
  const contactForm = document.getElementById('contactForm');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const logoutBtn = document.getElementById('logoutBtn');

  if (homeTrackForm) homeTrackForm.addEventListener('submit', handleHomeTrack);
  if (trackForm) trackForm.addEventListener('submit', handleTrackForm);
  if (contactForm) contactForm.addEventListener('submit', handleContactForm);
  if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  const urlParams = new URLSearchParams(window.location.search);
const jobId = urlParams.get('jobId');

if (jobId && trackForm) {
  trackForm.jobId.value = jobId;
  handleTrackForm({
    preventDefault() {},
    currentTarget: trackForm
  });
}

  if (document.body.classList.contains('admin-page')) {
    const token = localStorage.getItem('mobileCareToken');
    if (!token) {
      window.location.href = '/admin-login.html';
      return;
    }
    loadAdminDashboard();
  }
});
async function loadShopInfo() {
    try {
        const response = await fetch("/api/public/shop-info");

        if (!response.ok) {
            throw new Error("Failed to load shop information");
        }

        const shop = await response.json();

        if (!shop) {
            return;
        }

        const shopName =
            document.getElementById("trackerShopName");

        const shopAddress =
            document.getElementById("trackerShopAddress");

        const shopContact =
            document.getElementById("trackerShopContact");

        const shopEmail =
            document.getElementById("trackerShopEmail");

        const shopTiming =
            document.getElementById("trackerShopTiming");

        const photoContainer =
            document.getElementById("shopPhotoContainer");

        const photo =
            document.getElementById("shopPhoto");


        if (shopName) {
            shopName.textContent =
                shop.shop_name || "Mobile Care";
        }

        if (shopAddress) {
            shopAddress.textContent =
                shop.address || "-";
        }

        if (shopContact) {
            shopContact.textContent =
                shop.contact_number || "-";
        }

        if (shopEmail) {
            shopEmail.textContent =
                shop.email || "-";
        }

        if (shopTiming) {
            shopTiming.textContent =
                shop.shop_timing || "-";
        }


        if (
            shop.photo_url &&
            photoContainer &&
            photo
        ) {
            photo.src = shop.photo_url;
            photoContainer.style.display = "block";
        }

    } catch (error) {

        console.error(
            "Shop information error:",
            error
        );

    }
}
