const API = "/api";

const token = () => localStorage.getItem("mobileCareToken");
function checkAdminSession() {
    if (!token()) {
        window.location.replace('/admin-login.html');
        return false;
    }

    return true;
}

window.addEventListener('pageshow', () => {
    checkAdminSession();
});

function headers() {
    return {
        "Content-Type": "application/json",
        ...(token()
            ? { Authorization: `Bearer ${token()}` }
            : {})
    };
}

async function api(path, options = {}) {

    const response = await fetch(API + path, {
        ...options,
        headers: {
            ...headers(),
            ...(options.headers || {})
        }
    });

    let data = null;

    try {
        data = await response.json();
    } catch (e) {}

    if (response.status === 401) {
        localStorage.removeItem("mobileCareToken");
        localStorage.removeItem("mobileCareAdmin");

        window.location.href = "/admin-login.html";

        throw new Error("Session expired");
    }

    if (!response.ok) {
        throw new Error(
            data?.message || "Request failed"
        );
    }

    return data;
}


/* ================= HELPERS ================= */

const $ = id => document.getElementById(id);

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char]));
}


function money(value) {

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(Number(value || 0));
}


function toast(message, error = false) {

    const element = $("toast");

    element.textContent = message;

    element.className =
        "toast show" + (error ? " error" : "");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {

        element.className = "toast";

    }, 3000);
}


function statusBadge(status) {

    let className = "s-pending";

    if (
        status === "Ready for Pickup"
    ) {
        className = "s-ready";
    }

    if (
        status === "Delivered"
    ) {
        className = "s-delivered";
    }

    if (
        status === "Diagnosis in Progress" ||
        status === "Repair in Progress" ||
        status === "Quality Testing"
    ) {
        className = "s-progress";
    }

    return `
        <span class="status ${className}">
            ${escapeHTML(status)}
        </span>
    `;
}


/* ================= NAVIGATION ================= */

/* ================= NAVIGATION ================= */

function showSection(section) {

    document
        .querySelectorAll(".section")
        .forEach(element => {
            element.classList.remove("active");
        });

    const target = $(section);

    if (!target) return;

    target.classList.add("active");

    document
        .querySelectorAll(".nav-item")
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.section === section
            );
        });

    const titles = {

        dashboard: [
            "Dashboard",
            "Overview of your mobile repair shop"
        ],

        customers: [
            "Customers",
            "Manage customer information"
        ],

        repairs: [
            "Repairs",
            "Create and manage repair jobs"
        ],

        sales: [
            "Sales",
            "Manage accessory sales"
        ],

        inventory: [
            "Inventory",
            "Manage accessories and spare parts"
        ],

        warranty: [
            "Warranty Tracker",
            "Track active and expired warranties"
        ],

        onlineOrders: [
            "Online Orders",
            "Manage orders from the Mobile Care online store"
        ],

        shop: [
            "Shop Information",
            "Manage your shop details"
        ]

    };

    $("pageTitle").textContent =
        titles[section][0];

    $("pageSubtitle").textContent =
        titles[section][1];


    if (section === "dashboard")
        loadDashboard();

    if (section === "customers")
        loadCustomers();

    if (section === "repairs")
        loadRepairs();

    if (section === "sales")
        loadSales();

    if (section === "inventory")
        loadInventory();

    if (section === "warranty")
        loadWarranty();

    if (section === "onlineOrders")
        loadOnlineOrders();

    if (section === "shop")
        loadShopInfo();

}

/* ================= SHOP INFORMATION ================= */

async function loadShopInfo() {

    try {

        const shop =
            await api("/admin/shop-info");


        $("shopSection").innerHTML = `

            <div class="shop-info-card">

                <div class="shop-info-header">

                    <div>
                        <h2>Shop Information</h2>

                        <p>
                            Manage the information shown to customers.
                        </p>
                    </div>

                </div>


                <form id="shopInfoForm">

                    <div class="shop-form-grid">


                        <div class="shop-field">

                            <label>
                                Shop Name
                            </label>

                            <input
                                type="text"
                                name="shopName"
                                value="${escapeHTML(
                                    shop?.shop_name || ""
                                )}"
                                required
                            >

                        </div>


                        <div class="shop-field">

                            <label>
                                Contact Number
                            </label>

                            <input
                                type="text"
                                name="contactNumber"
                                value="${escapeHTML(
                                    shop?.contact_number || ""
                                )}"
                                required
                            >

                        </div>


                        <div class="shop-field shop-full">

                            <label>
                                Shop Address
                            </label>

                            <textarea
                                name="address"
                                rows="3"
                                required
                            >${escapeHTML(
                                shop?.address || ""
                            )}</textarea>

                        </div>


                        <div class="shop-field">

                            <label>
                                Shop Email
                            </label>

                            <input
                                type="email"
                                name="email"
                                value="${escapeHTML(
                                    shop?.email || ""
                                )}"
                                required
                            >

                        </div>


                        <div class="shop-field">

                            <label>
                                Shop Timing
                            </label>

                            <input
                                type="text"
                                name="shopTiming"
                                placeholder="10:00 AM - 9:00 PM"
                                value="${escapeHTML(
                                    shop?.shop_timing || ""
                                )}"
                                required
                            >

                        </div>


                <div class="shop-field shop-full">

    <label>
        Shop Photo
        <span>(Optional)</span>
    </label>

    <input
        id="shopPhotoFile"
        name="photoFile"
        type="file"
        accept="image/*"
    >

    <small>
        Choose a shop photo from your gallery or computer.
        Leave empty to keep the current photo.
    </small>

    <div style="margin-top:10px;">

        ${
            shop?.photo_url
                ? `
                    <img
                        id="shopPhotoPreview"
                        src="${escapeHTML(shop.photo_url)}"
                        alt="Current Shop Photo"
                        style="
                            width:140px;
                            height:100px;
                            object-fit:cover;
                            border-radius:10px;
                            border:1px solid #ddd;
                        "
                    >
                  `
                : `
                    <img
                        id="shopPhotoPreview"
                        alt="Shop Photo Preview"
                        style="
                            display:none;
                            width:140px;
                            height:100px;
                            object-fit:cover;
                            border-radius:10px;
                            border:1px solid #ddd;
                        "
                    >
                  `
        }

    </div>

</div>


                    </div>


                    <div class="shop-form-actions">

                        <button
                            type="submit"
                            class="shop-save-btn"
                        >
                            Save Shop Information
                        </button>

                    </div>

                </form>

            </div>

        `;


        const form =
            $("shopInfoForm");

const shopPhotoFile =
    $("shopPhotoFile");

const shopPhotoPreview =
    $("shopPhotoPreview");


if (shopPhotoFile && shopPhotoPreview) {

    shopPhotoFile.onchange = () => {

        const file =
            shopPhotoFile.files[0];

        if (!file) {
            return;
        }

        shopPhotoPreview.src =
            URL.createObjectURL(file);

        shopPhotoPreview.style.display =
            "block";
    };

}
form.onsubmit =
    async event => {

        event.preventDefault();

        try {

            const photoFile =
                form.photoFile.files[0];

            /*
             * Keep the existing shop photo
             * if no new photo is selected.
             */
            let photoUrl =
                shop?.photo_url || "";


            /*
             * If admin selected a new photo,
             * convert it to a compressed image.
             */
            if (photoFile) {

                photoUrl =
                    await imageFileToDataURL(
                        photoFile
                    );

            }


            await api(
                "/admin/shop-info",
                {
                    method: "PUT",

                    body: JSON.stringify({

                        shopName:
                            form.shopName.value.trim(),

                        address:
                            form.address.value.trim(),

                        contactNumber:
                            form.contactNumber.value.trim(),

                        email:
                            form.email.value.trim(),

                        shopTiming:
                            form.shopTiming.value.trim(),

                        photoUrl:
                            photoUrl

                    })
                }
            );


            toast(
                "Shop information saved successfully."
            );


            /*
             * Reload shop information so the
             * new image appears immediately.
             */
            await loadShopInfo();


        } catch (error) {

            console.error(
                "Shop info save error:",
                error
            );

            toast(
                error.message ||
                "Failed to save shop information.",
                true
            );

        }

    };
        

    } catch (error) {

        toast(
            error.message,
            true
        );

    }

}
/* ================= MODAL ================= */

function openModal(title, html) {

    $("modalTitle").textContent = title;

    $("modalBody").innerHTML = html;

    $("modal").classList.remove("hidden");
}


function closeModal() {

    $("modal").classList.add("hidden");
}


/* ================= FORM FIELD ================= */

function field(
    label,
    name,
    type = "text",
    required = false,
    full = false
) {
    return `
        <div class="field ${full ? "full" : ""}">

            <label>${label}</label>

            ${
                type === "textarea"

                ?

                `<textarea
                    id="${name}"
                    name="${name}"
                    ${required ? "required" : ""}
                ></textarea>`

                :

                `<input
                    id="${name}"
                    type="${type}"
                    name="${name}"
                    ${required ? "required" : ""}
                >`
            }

        </div>
    `;
}

/* =====================================================
   DASHBOARD
===================================================== */

async function loadDashboard() {

    try {

        const data =
            await api("/admin/dashboard");


        const totals = data.totals || {};


        $("totalRepairs").textContent =
            totals.totalRepairs || 0;

        $("inProgress").textContent =
            totals.inProgress || 0;

        $("readyPickup").textContent =
            totals.readyForPickup || 0;

$("onlineSaleRevenue").textContent =
    money(totals.onlineSaleRevenue);

        $("todaysSales").textContent =
            money(totals.todaysSales);

        $("monthlyRevenue").textContent =
            money(totals.monthlyRevenue);


        /* RECENT REPAIRS */

        const repairs =
            data.recentRepairs || [];


        if (repairs.length === 0) {

            $("recentRepairs").innerHTML =
                `<div class="empty">
                    No repair jobs yet.
                </div>`;

        } else {

            $("recentRepairs").innerHTML = `

                <table>

                    <thead>

                        <tr>
                            <th>Job ID</th>
                            <th>Customer</th>
                            <th>Status</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${repairs.map(repair => `

                            <tr>

                                <td>
                                    <b>
                                        ${escapeHTML(
                                            repair.job_id
                                        )}
                                    </b>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        repair.customer_name
                                    )}
                                </td>

                                <td>
                                    ${statusBadge(
                                        repair.status
                                    )}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>
            `;
        }


        /* LOW STOCK */

        const lowStock =
            data.lowStock || [];


        if (lowStock.length === 0) {

            $("lowStock").innerHTML =
                `<div class="empty">
                    No low-stock items.
                </div>`;

        } else {

            $("lowStock").innerHTML = `

                <table>

                    <thead>

                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${lowStock.map(item => `

                            <tr>

                                <td>
                                    ${escapeHTML(
                                        item.product_name
                                    )}
                                </td>

                                <td class="low">
                                    ${item.quantity}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>
            `;
        }

    } catch (error) {

        toast(error.message, true);

    }
}


/* =====================================================
   CUSTOMERS
===================================================== */

async function loadCustomers() {

    try {

        const search =
            $("customerSearch").value.trim();


        let url = "/admin/customers";


        if (search) {

            url +=
                "?search=" +
                encodeURIComponent(search);

        }


        const customers =
            await api(url);


        if (!customers.length) {

            $("customersTable").innerHTML =
                `<div class="empty">
                    No customers found.
                </div>`;

            return;
        }


        $("customersTable").innerHTML = `

            <table>

                <thead>

                    <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Address</th>
                        <th>Action</th>
                    </tr>

                </thead>

                <tbody>

                    ${customers.map(customer => `

                        <tr>

                            <td>
                                <b>
                                    ${escapeHTML(
                                        customer.name
                                    )}
                                </b>
                            </td>

                            <td>
                                ${escapeHTML(
                                    customer.phone
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    customer.email
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    customer.address || "-"
                                )}
                            </td>

                            <td>

                                <button
                                    class="link-btn edit-customer"
                                    data-id="${customer.id}"
                                >
                                    Edit
                                </button>

                                <button
                                    class="link-btn delete-customer"
                                    data-id="${customer.id}"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>
        `;


        document
            .querySelectorAll(".edit-customer")
            .forEach(button => {

                button.onclick = () => {

                    const customer =
                        customers.find(
                            item =>
                                item.id ==
                                button.dataset.id
                        );

                    customerForm(customer);

                };

            });


        document
            .querySelectorAll(".delete-customer")
            .forEach(button => {

                button.onclick = async () => {

                    if (
                        !confirm(
                            "Delete this customer?"
                        )
                    ) return;


                    try {

                        await api(
                            "/admin/customers/" +
                            button.dataset.id,
                            {
                                method: "DELETE"
                            }
                        );


                        toast(
                            "Customer deleted"
                        );

                        loadCustomers();

                    } catch (error) {

                        toast(
                            error.message,
                            true
                        );

                    }

                };

            });

    } catch (error) {

        toast(error.message, true);

    }
}


/* ================= CUSTOMER FORM ================= */

function customerForm(customer = {}) {

    openModal(

        customer.id
            ? "Edit Customer"
            : "Add Customer",

        `

        <form class="form" id="customerForm">

            <div class="form-grid">

                ${field(
                    "Customer Name",
                    "name",
                    "text",
                    true
                )}

                ${field(
                    "Phone",
                    "phone",
                    "text",
                    true
                )}

                ${field(
                    "Email",
                    "email",
                    "email",
                    true
                )}

                ${field(
                    "Address",
                    "address",
                    "text",
                    false,
                    true
                )}

            </div>


            <div class="form-actions">

                <button
                    type="button"
                    class="secondary"
                    id="cancelModal"
                >
                    Cancel
                </button>

                <button class="primary">
                    Save Customer
                </button>

            </div>

        </form>

        `
    );


    const form =
        $("customerForm");


    if (customer.id) {

        Object.keys(customer)
            .forEach(key => {

                if (form.elements[key]) {

                    form.elements[key].value =
                        customer[key] ?? "";

                }

            });

    }


    form.onsubmit = async event => {

        event.preventDefault();


        const data =
            Object.fromEntries(
                new FormData(form)
            );


        try {

            await api(

                customer.id
                    ? `/admin/customers/${customer.id}`
                    : "/admin/customers",

                {
                    method:
                        customer.id
                            ? "PUT"
                            : "POST",

                    body:
                        JSON.stringify(data)
                }

            );


            closeModal();

            toast(
                "Customer saved successfully"
            );

            loadCustomers();

        } catch (error) {

            toast(
                error.message,
                true
            );

        }

    };


    $("cancelModal").onclick =
        closeModal;
}


/* =====================================================
   REPAIRS
===================================================== */

async function loadRepairs() {

    try {

        const search =
            $("repairSearch").value.trim();

        const status =
            $("repairStatusFilter").value;


        let url =
            "/admin/repairs?";


        if (search) {

            url +=
                "search=" +
                encodeURIComponent(search) +
                "&";

        }


        if (status) {

            url +=
                "status=" +
                encodeURIComponent(status);

        }


        const repairs =
            await api(url);


        if (!repairs.length) {

            $("repairsTable").innerHTML =
                `<div class="empty">
                    No repair jobs found.
                </div>`;

            return;
        }


        $("repairsTable").innerHTML = `

            <table>

                <thead>

                    <tr>

                        <th>Job ID</th>
                        <th>Customer</th>
                        <th>Device</th>
                        <th>Status</th>
                        <th>Cost</th>
                        <th>Action</th>

                    </tr>

                </thead>

                <tbody>

                    ${repairs.map(repair => `

                        <tr>

                            <td>
                                <b>
                                    ${escapeHTML(
                                        repair.job_id
                                    )}
                                </b>
                            </td>

                            <td>
                                ${escapeHTML(
                                    repair.customer_name
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    repair.mobile_brand
                                )}
                                ${escapeHTML(
                                    repair.mobile_model
                                )}
                            </td>

                            <td>
                                ${statusBadge(
                                    repair.status
                                )}
                            </td>

                            <td>
                                ${money(
                                    repair.estimated_cost
                                )}
                            </td>

                          <td>

    <button
        class="link-btn update-repair"
        data-id="${repair.id}"
    >
        Update
    </button>

    <button
        class="danger"
        onclick="deleteRepair(${repair.id})"
    >
        Delete
    </button>

</td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>
        `;


        document
            .querySelectorAll(".update-repair")
            .forEach(button => {

                button.onclick = () => {

                    const repair =
                        repairs.find(
                            item =>
                                item.id ==
                                button.dataset.id
                        );

                    updateRepair(repair);

                };

            });

    } catch (error) {

        toast(error.message, true);

    }
}
async function deleteRepair(id) {

    if (!confirm(
        "Delete this repair job?\n\nThis cannot be undone."
    )) {
        return;
    }

    try {

        await api(`/admin/repairs/${id}`, {
            method: "DELETE"
        });

        toast("Repair deleted successfully.");

        await loadRepairs();

        if (typeof loadDashboard === "function") {
            await loadDashboard();
        }

    } catch (error) {

        console.error(
            "Delete repair error:",
            error
        );

        toast(
            error.message ||
            "Failed to delete repair.",
            true
        );
    }
}


/* ================= ADD REPAIR ================= */
function repairForm() {

    openModal(
        "Add Repair",

        `
        <form class="form" id="repairForm">

            <div class="form-grid">

                <!-- CUSTOMER -->
                <div class="field full">

                    <label>Customer</label>

                    <input
                        type="text"
                        id="repairCustomerSearch"
                        placeholder="Search customer by name or phone"
                        autocomplete="off"
                    >

                    <div
                        id="repairCustomerResults"
                        style="margin-top:8px;"
                    ></div>

                    <input
                        type="hidden"
                        id="repairCustomerId"
                        name="customerId"
                    >

                </div>

                <!-- SELECTED CUSTOMER -->
                <div
                    id="repairSelectedCustomer"
                    class="selected-customer-card"
                    style="display:none;"
                ></div>

                <!-- ADD CUSTOMER -->
                <div
                    id="repairAddCustomerArea"
                    class="field full"
                    style="display:none;"
                >

                    <div class="form-grid">

                        ${field(
                            "Customer Name",
                            "newRepairCustomerName",
                            "text",
                            
                        )}

                        ${field(
                            "Phone",
                            "newRepairCustomerPhone",
                            "text"
                            
                        )}

                        ${field(
                            "Email",
                            "newRepairCustomerEmail",
                            "email"
                        )}

                    </div>

                    <button
                        type="button"
                        class="secondary"
                        id="addCustomerFromRepair"
                    >
                        + Add Customer
                    </button>

                </div>

                <!-- REPAIR DETAILS -->

                ${field(
                    "Mobile Brand",
                    "mobileBrand",
                    "text",
                    true
                )}

                ${field(
                    "Mobile Model",
                    "mobileModel",
                    "text",
                    true
                )}

                ${field(
                    "IMEI",
                    "imei",
                    "text",
                    true
                )}

                ${field(
                    "Estimated Cost ₹",
                    "estimatedCost",
                    "number"
                )}

                ${field(
                    "Assigned Technician",
                    "assignedTechnician"
                )}

                ${field(
                    "Expected Completion",
                    "expectedCompletionDate",
                    "date"
                )}

                <div class="field">

    <label for="warrantyPeriod">
        Warranty
    </label>

    <select
        id="warrantyPeriod"
        name="warrantyPeriod"
    >
        <option value="0">
            No Warranty
        </option>

        <option value="3">
            3 Months
        </option>
    </select>

</div>
                

                ${field(
                    "Parts Used",
                    "partsUsed",
                    "text",
                    false,
                    true
                )}

                ${field(
                    "Problem Description",
                    "problemDescription",
                    "textarea",
                    true,
                    true
                )}

            </div>

            <div class="form-actions">

                <button
                    type="button"
                    class="secondary"
                    id="cancelModal"
                >
                    Cancel
                </button>

                <button
                    class="primary"
                    type="submit"
                >
                    Create Repair
                </button>

            </div>

        </form>
        `
    );


    const form = $("repairForm");

    const search =
        $("repairCustomerSearch");

    const results =
        $("repairCustomerResults");

    const customerId =
        $("repairCustomerId");

    const selected =
        $("repairSelectedCustomer");

    const addArea =
        $("repairAddCustomerArea");
        const addCustomerBtn =
    $("addCustomerFromRepair");

addCustomerBtn.onclick = async () => {

   const nameInput = $("newRepairCustomerName");
const phoneInput = $("newRepairCustomerPhone");
const emailInput = $("newRepairCustomerEmail");

if (!nameInput || !phoneInput) {
    console.error(
        "Repair customer fields missing:",
        {
            nameInput,
            phoneInput,
            emailInput
        }
    );

    toast(
        "Customer fields are missing. Please refresh the page.",
        true
    );

    return;
}

const name = nameInput.value.trim();
const phone = phoneInput.value.trim();
const email = emailInput ? emailInput.value.trim() : "";

    if (!name || !phone) {
        toast(
            "Customer name and phone are required.",
            true
        );
        return;
    }

    try {

        const customer =
            await api(
                "/admin/customers",
                {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        phone,
                        email,
                        address: ""
                    })
                }
            );

        customerId.value =
            customer.id;

        search.value =
            customer.name;

        selected.style.display =
            "block";

        selected.innerHTML = `
            <strong>
                ${escapeHTML(customer.name)}
            </strong>

            <div>
                ${escapeHTML(customer.phone || "")}
                ${
                    customer.email
                        ? " • " +
                          escapeHTML(customer.email)
                        : ""
                }
            </div>

            <small>
                Customer added and selected ✓
            </small>
        `;

        results.innerHTML = "";

        addArea.style.display =
            "none";

        toast("Customer added successfully.");

    } catch (error) {

        console.error(
            "Repair customer error:",
            error
        );

        toast(
            error.message ||
            "Failed to add customer.",
            true
        );
    }
};


    /* ================= CUSTOMER SEARCH ================= */

    let searchTimer;

    search.oninput = () => {

        clearTimeout(searchTimer);

        const value =
            search.value.trim();

        if (!value) {

            results.innerHTML = "";
            addArea.style.display = "none";

            return;
        }

        searchTimer =
            setTimeout(async () => {

                try {

                    const customers =
                        await api(
                            "/admin/customers?search=" +
                            encodeURIComponent(value)
                        );

                    if (!customers.length) {

                        results.innerHTML = `
                            <div
                                class="empty"
                                style="padding:12px;"
                            >
                                No customer found.
                                <br><br>

                                <button
                                    type="button"
                                    class="secondary"
                                    id="showRepairAddCustomer"
                                >
                                    + Add New Customer
                                </button>
                            </div>
                        `;

                        addArea.style.display = "none";

                $("showRepairAddCustomer").onclick =
    () => {

        addArea.style.display =
            "block";

        const nameInput =
            $("newRepairCustomerName");

        const phoneInput =
            $("newRepairCustomerPhone");

        if (nameInput) {
            nameInput.value =
                search.value.trim();
        }

        if (phoneInput) {
            phoneInput.focus();
        }

    };

                        return;
                    }


                    addArea.style.display = "none";

                    results.innerHTML =
                        customers.slice(0, 5).map(customer => `

                            <button
                                type="button"
                                class="secondary"
                                style="
                                    width:100%;
                                    text-align:left;
                                    margin-bottom:6px;
                                "
                                data-customer-id="${customer.id}"
                                data-customer-name="${escapeHTML(customer.name)}"
                                data-customer-phone="${escapeHTML(customer.phone || '')}"
                                data-customer-email="${escapeHTML(customer.email || '')}"
                            >

                                <strong>
                                    ${escapeHTML(customer.name)}
                                </strong>

                                <br>

                                <small>
                                    ${escapeHTML(customer.phone || '')}
                                    ${customer.email
                                        ? " • " + escapeHTML(customer.email)
                                        : ""}
                                </small>

                            </button>

                        `).join("");


                    results
                        .querySelectorAll("[data-customer-id]")
                        .forEach(button => {

                            button.onclick = () => {

                                customerId.value =
                                    button.dataset.customerId;

                                const name =
                                    button.dataset.customerName;

                                const phone =
                                    button.dataset.customerPhone;

                               const email =
    button.dataset.customerEmail || "";

                                selected.style.display =
                                    "block";

                                selected.innerHTML = `
                                    <strong>
                                        ${name}
                                    </strong>

                                    <div>
                                        ${phone}
                                        ${email
                                            ? " • " + email
                                            : ""}
                                    </div>

                                    <small>
                                        Customer selected ✓
                                    </small>
                                `;

                                search.value = name;

                                results.innerHTML = "";

                                addArea.style.display =
                                    "none";

                            };

                        });

                } catch (error) {

                    results.innerHTML = `
                        <div class="message">
                            ${escapeHTML(
                                error.message ||
                                "Unable to search customers."
                            )}
                        </div>
                    `;

                }

            }, 300);
    };


    /* ================= ADD CUSTOMER ================= */


    /* ================= CREATE REPAIR ================= */

    form.onsubmit =
        async event => {

            event.preventDefault();


            if (!customerId.value) {

                toast(
                    "Please select or add a customer.",
                    true
                );

                return;
            }


            const data =
                Object.fromEntries(
                    new FormData(form)
                );


            try {

                const result =
                    await api(
                        "/admin/repairs",
                        {
                            method: "POST",

                            body:
                                JSON.stringify(data)
                        }
                    );


                closeModal();


                toast(
                    "Repair created: " +
                    (result.job_id || "")
                );


                loadRepairs();
                loadDashboard();


            } catch (error) {

                toast(
                    error.message ||
                    "Failed to create repair.",
                    true
                );

            }

        };


    $("cancelModal").onclick =
        closeModal;
}



/* ================= UPDATE REPAIR ================= */

function updateRepair(repair) {

    openModal(

        "Update Repair",

        `

        <form class="form" id="repairUpdate">

            <div class="form-grid">

                <div class="field full">

                    <label>Job ID</label>

                    <input
                        value="${escapeHTML(
                            repair.job_id
                        )}"
                        disabled
                    >

                </div>


                <div class="field full">

                    <label>Status</label>

                    <select name="status">

                        ${[
                            "Repair Request Received",
                            "Diagnosis in Progress",
                            "Waiting for Spare Parts",
                            "Repair in Progress",
                            "Quality Testing",
                            "Ready for Pickup",
                            "Delivered",
                            "Cancelled"
                        ]
                        .map(status => `

                            <option
                                ${
                                    status ===
                                    repair.status
                                        ? "selected"
                                        : ""
                                }
                            >
                                ${status}
                            </option>

                        `)
                        .join("")}

                    </select>

                </div>


                ${field(
                    "Technician",
                    "assignedTechnician"
                )}

                ${field(
                    "Expected Completion",
                    "expectedCompletionDate",
                    "date"
                )}

                <div class="field">

    <label for="warrantyPeriod">
        Warranty
    </label>

    <select
        id="warrantyPeriod"
        name="warrantyPeriod"
    >
        <option value="0">
            No Warranty
        </option>

        <option value="3">
            3 Months
        </option>
    </select>

</div>
            </div>


            <div class="form-actions">

                <button
                    type="button"
                    class="secondary"
                    id="cancelModal"
                >
                    Cancel
                </button>

                <button class="primary">
                    Update Repair
                </button>

            </div>

        </form>

        `
    );


    const form =
        $("repairUpdate");


    form.assignedTechnician.value =
        repair.assigned_technician || "";


    if (repair.expected_completion_date) {

        form.expectedCompletionDate.value =
            String(
                repair.expected_completion_date
            ).slice(0, 10);

    }


    form.warrantyPeriod.value =
    repair.warranty_period || 0;


    form.onsubmit = async event => {

        event.preventDefault();


        const data =
            Object.fromEntries(
                new FormData(form)
            );


        try {

            await api(
                `/admin/repairs/${repair.id}`,
                {
                    method: "PUT",
                    body:
                        JSON.stringify(data)
                }
            );


            closeModal();

            toast(
                "Repair updated successfully"
            );


            loadRepairs();

            loadDashboard();

        } catch (error) {

            toast(
                error.message,
                true
            );

        }

    };


    $("cancelModal").onclick =
        closeModal;
}


/* =====================================================
   INVENTORY
===================================================== */

async function loadInventory() {

    try {

        const items =
            await api("/admin/inventory");


        if (!items.length) {

            $("inventoryTable").innerHTML =
                `<div class="empty">
                    No inventory items.
                </div>`;

            return;
        }


        $("inventoryTable").innerHTML = `

            <table>

                <thead>

                    <tr>

                        <th>Product</th>
                        <th>Category</th>
                        <th>Brand</th>
                        <th>Quantity</th>
                        <th>Purchase</th>
                        <th>Selling</th>
                        <th>Stock</th>
                        <th>Actions</th>

                    </tr>

                </thead>


                <tbody>

                    ${items.map(item => `

                        <tr>

                            <td>
                                <b>
                                    ${escapeHTML(
                                        item.product_name
                                    )}
                                </b>
                            </td>

                            <td>
                                ${escapeHTML(
                                    item.category
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    item.brand || "-"
                                )}
                            </td>

                            <td
                                class="${
                                    Number(
                                        item.quantity
                                    ) <=
                                    Number(
                                        item.minimum_stock_level
                                    )
                                        ? "low"
                                        : ""
                                }"
                            >
                                ${item.quantity}
                            </td>

                            <td>
                                ${money(
                                    item.purchase_price
                                )}
                            </td>

                            <td>
                                ${money(
                                    item.selling_price
                                )}
                            </td>

                            <td>

                                ${
                                    Number(
                                        item.quantity
                                    ) <=
                                    Number(
                                        item.minimum_stock_level
                                    )

                                    ?

                                    `<span class="status s-expired">
                                        Low
                                    </span>`

                                    :

                                    `<span class="status s-active">
                                        OK
                                    </span>`
                                }

                            </td>

                            <td>

                                <button
                                    class="secondary"
                                    onclick='editInventory(${JSON.stringify(item)})'
                                >
                                    Edit
                                </button>

                                <button
                                    class="danger"
                                    onclick="deleteInventory(${item.id})"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>
        `;

    } catch (error) {

        console.error(
            "Load inventory error:",
            error
        );

        toast(
            error.message,
            true
        );

    }
}
async function deleteInventory(id) {

    if (!confirm(
        "Delete this inventory item?\n\nThis cannot be undone."
    )) {
        return;
    }

    try {

        await api(`/admin/inventory/${id}`, {
            method: "DELETE"
        });

        toast("Inventory item deleted successfully.");

        await loadInventory();

        if (typeof loadSales === "function") {
            await loadSales();
        }

        if (typeof loadDashboard === "function") {
            await loadDashboard();
        }

    } catch (error) {

        console.error(
            "Delete inventory error:",
            error
        );

        toast(
            error.message ||
            "Failed to delete inventory item.",
            true
        );
    }
}

async function imageFileToDataURL(file) {
    if (!file) return "";

    if (!file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file.");
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                const MAX_SIZE = 1000;

                let width = img.width;
                let height = img.height;

                if (width > height && width > MAX_SIZE) {
                    height = Math.round(height * MAX_SIZE / width);
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width = Math.round(width * MAX_SIZE / height);
                    height = MAX_SIZE;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                resolve(
                    canvas.toDataURL("image/jpeg", 0.80)
                );
            };

            img.onerror = () => {
                reject(new Error("Unable to read the selected image."));
            };

            img.src = reader.result;
        };

        reader.onerror = () => {
            reject(new Error("Unable to read the image file."));
        };

        reader.readAsDataURL(file);
    });
}

function editInventory(item) {

    $("modalBody").innerHTML = `

        <form id="editInventoryForm" class="form">

            <div class="form-grid">

                <div class="field">
                    <label>Product Name</label>
                    <input
                        name="productName"
                        value="${escapeHTML(item.product_name || "")}"
                        required
                    >
                </div>

                <div class="field">
                    <label>Category</label>
                    <input
                        name="category"
                        value="${escapeHTML(item.category || "")}"
                        required
                    >
                </div>

                <div class="field">
                    <label>Brand</label>
                    <input
                        name="brand"
                        value="${escapeHTML(item.brand || "")}"
                    >
                </div>

                <div class="field">
                    <label>Model Compatibility</label>
                    <input
                        name="modelCompatibility"
                        value="${escapeHTML(item.model_compatibility || "")}"
                    >
                </div>

                <div class="field">
                    <label>Quantity</label>
                    <input
                        type="number"
                        name="quantity"
                        min="0"
                        value="${Number(item.quantity || 0)}"
                        required
                    >
                </div>

                <div class="field">
                    <label>Minimum Stock Level</label>
                    <input
                        type="number"
                        name="minimumStockLevel"
                        min="0"
                        value="${Number(item.minimum_stock_level || 0)}"
                    >
                </div>
<div class="field">

    <label for="editImageFile">
        Product Image
    </label>

    <input
        id="editImageFile"
        name="imageFile"
        type="file"
        accept="image/*"
    >

    <small>
        Select a new image from your phone or computer.
        Leave empty to keep the current image.
    </small>

    <div style="margin-top:10px;">

        ${
            item.image_url
                ? `
                    <img
                        id="editImagePreview"
                        src="${escapeHTML(item.image_url)}"
                        alt="Current Product Image"
                        style="
                            width:120px;
                            height:120px;
                            object-fit:cover;
                            border-radius:10px;
                            border:1px solid #ddd;
                        "
                    >
                  `
                : `
                    <img
                        id="editImagePreview"
                        alt="Product Image Preview"
                        style="
                            display:none;
                            width:120px;
                            height:120px;
                            object-fit:cover;
                            border-radius:10px;
                            border:1px solid #ddd;
                        "
                    >
                  `
        }

    </div>

</div>
           
                <div class="instagram-product-field">
                    <label>Instagram Post URL</label>
                    <input name="instagramUrl" value="${escapeHTML(item.instagram_url || "")}" placeholder="https://instagram.com/...">
                </div>

                <div class="field">
                    <label class="check-row"><input type="checkbox" name="onlineEnabled" ${item.online_enabled ? "checked" : ""}> Show in Online Store</label>
                </div>

                <div class="field">
                    <label>Purchase Price</label>
                    <input
                        type="number"
                        name="purchasePrice"
                        min="0"
                        step="0.01"
                        value="${Number(item.purchase_price || 0)}"
                        required
                    >
                </div>

                <div class="field">
                    <label>Selling Price</label>
                    <input
                        type="number"
                        name="sellingPrice"
                        min="0"
                        step="0.01"
                        value="${Number(item.selling_price || 0)}"
                        required
                    >
                </div>

            </div>

            <div class="form-actions">

                <button
                    type="button"
                    class="secondary"
                    onclick="$('modal').classList.add('hidden')"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="primary"
                >
                    Update Inventory
                </button>

            </div>

        </form>
    `;

    $("modal").classList.remove("hidden");
    const editImageFile =
    $("editImageFile");

const editImagePreview =
    $("editImagePreview");

if (editImageFile && editImagePreview) {

    editImageFile.onchange = () => {

        const file =
            editImageFile.files[0];

        if (!file) {
            return;
        }

        editImagePreview.src =
            URL.createObjectURL(file);

        editImagePreview.style.display =
            "block";
    };
}

    $("editInventoryForm").onsubmit =
        async function (event) {

            event.preventDefault();

            const form = event.target;

           const imageFile =
    form.imageFile.files[0];

let imageUrl =
    item.image_url || "";

if (imageFile) {

    imageUrl =
        await imageFileToDataURL(imageFile);
}


const data = {

    productName:
        form.productName.value.trim(),

    category:
        form.category.value.trim(),

    brand:
        form.brand.value.trim(),

    modelCompatibility:
        form.modelCompatibility.value.trim(),

    quantity:
        Number(form.quantity.value || 0),

    purchasePrice:
        Number(form.purchasePrice.value || 0),

    sellingPrice:
        Number(form.sellingPrice.value || 0),

    minimumStockLevel:
        Number(
            form.minimumStockLevel.value || 0
        ),

    imageUrl:
        imageUrl,

    instagramUrl:
        form.instagramUrl.value.trim(),

    onlineEnabled:
        form.onlineEnabled.checked
};

            try {

                await api(
                    `/admin/inventory/${item.id}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(data)
                    }
                );

                $("modal").classList.add("hidden");

                toast(
                    "Inventory updated successfully."
                );

                await loadInventory();

            } catch (error) {

                console.error(
                    "Update inventory error:",
                    error
                );

                toast(
                    error.message ||
                    "Failed to update inventory.",
                    true
                );
            }
        };
}

/* ================= ADD INVENTORY ================= */

function inventoryForm() {

    openModal(

        "Add Inventory Item",

        `
        <form class="form" id="inventoryForm">

            <div class="form-grid">

                ${field(
                    "Product Name",
                    "productName",
                    "text",
                    true
                )}

                ${field(
                    "Brand",
                    "brand"
                )}

               <div class="form-field">

    <label for="category">
        Type
    </label>

    <select
        id="category"
        name="category"
        required
    >

        <option value="">
            Select Type
        </option>

        <option value="Mobile Accessories">
            Mobile Accessories
        </option>

        <option value="Laptop Accessories">
            Laptop Accessories
        </option>

        <option value="Other">
            Other
        </option>

    </select>

</div>


                ${field(
                    "Purchase Price ₹",
                    "purchasePrice",
                    "number"
                )}


                ${field(
                    "Selling Price ₹",
                    "sellingPrice",
                    "number"
                )}


                ${field(
                    "Quantity",
                    "quantity",
                    "number",
                    true
                )}

                <div class="form-field">
    <label for="imageFile">Product Image</label>

    <input
        id="imageFile"
        name="imageFile"
        type="file"
        accept="image/*"
    >

    <small>
        Select an image from your phone or computer.
    </small>

    <img
        id="imagePreview"
        style="
            display:none;
            max-width:180px;
            margin-top:10px;
            border-radius:8px;
        "
        alt="Product image preview"
    >
    $("modal").classList.remove("hidden");
</div>

                <div class="form-field">
                    <label for="instagramUrl">Instagram Post URL</label>
                    <input id="instagramUrl" name="instagramUrl" type="url" placeholder="https://www.instagram.com/p/...">
                </div>

                <div class="form-field">
                    <label class="check-row"><input type="checkbox" name="onlineEnabled"> Show in Online Store</label>
                </div>

            </div>


            <div class="form-actions">

                <button
                    type="button"
                    class="secondary"
                    id="cancelModal"
                >
                    Cancel
                </button>

                <button
                    class="primary"
                >
                    Add Item
                </button>

            </div>

        </form>
        `
    );

    $("inventoryForm").onsubmit =
    async event => {

        event.preventDefault();

        const form = event.currentTarget;

        try {

            const imageFile =
                form.imageFile.files[0];

            let imageUrl = "";

            if (imageFile) {
                imageUrl =
                    await imageFileToDataURL(imageFile);
            }

            const data = {

                productName:
                    form.productName.value.trim(),

                brand:
                    form.brand.value.trim(),

                category:
                    form.category.value.trim(),

                modelCompatibility:
                    form.modelCompatibility
                        ? form.modelCompatibility.value.trim()
                        : "",

                quantity:
                    Number(form.quantity.value || 0),

                purchasePrice:
                    Number(form.purchasePrice.value || 0),

                sellingPrice:
                    Number(form.sellingPrice.value || 0),

                minimumStockLevel:
                    form.minimumStockLevel
                        ? Number(
                            form.minimumStockLevel.value || 0
                        )
                        : 5,

                imageUrl: imageUrl,

                instagramUrl:
                    form.instagramUrl.value.trim(),

                onlineEnabled:
                    form.onlineEnabled.checked
            };


            await api(
                "/admin/inventory",
                {
                    method: "POST",

                    body:
                        JSON.stringify(data)
                }
            );


            closeModal();


            toast(
                "Inventory item added"
            );


            await loadInventory();


        } catch (error) {

            console.error(
                "Add inventory error:",
                error
            );

            toast(
                error.message ||
                "Failed to add inventory item.",
                true
            );
        }
    };



    $("cancelModal").onclick =
        closeModal;
}


/* ================= LOAD SALES ================= */

async function loadSales() {

    try {

        const sales =
            await api("/admin/sales");
            const today =
    new Date().toLocaleDateString('en-CA');

let cashTotal = 0;
let onlineTotal = 0;

sales.forEach(sale => {

    const saleDate =
        new Date(sale.sale_date)
            .toLocaleDateString('en-CA');

    if (saleDate !== today) {
        return;
    }

    const amount =
        Number(sale.total_amount || 0);

    if (
        String(sale.payment_method)
            .toLowerCase() === 'cash'
    ) {
        cashTotal += amount;
    }

    if (
        String(sale.payment_method)
            .toLowerCase() === 'online'
    ) {
        onlineTotal += amount;
    }
});

$("todayCashTotal").textContent =
    money(cashTotal);

$("todayOnlineTotal").textContent =
    money(onlineTotal);


        if (!sales.length) {

            $("salesTable").innerHTML =
                `<div class="empty">
                    No sales yet.
                </div>`;

            return;
        }


        $("salesTable").innerHTML = `

            <table>

                <thead>

                    <tr>

                        <th>Date</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Discount</th>
                        <th>Payment Method</th>
                        <th>Actions</th>

                    </tr>

                </thead>


                <tbody>

                    ${sales.map(sale => `

                        <tr>

                            <td>
                                ${new Date(
                                    sale.sale_date
                                ).toLocaleString()}
                            </td>


                            <td>

                                <b>
                                    ${escapeHTML(
                                        sale.customer_name ||
                                        "Walk-in"
                                    )}
                                </b>

                            </td>


                            <td>

                                ${money(
                                    sale.total_amount
                                )}

                            </td>


                            <td>

                                ${money(
                                    sale.discount
                                )}

                            </td>


                            <td>

                                ${escapeHTML(
                                    sale.payment_method ||
                                    "Cash"
                                )}

                            </td>


                            <td>

                                <button
                                    class="danger"
                                    onclick="deleteSale(${sale.id})"
                                >
                                    Delete
                                </button>

                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        `;

    } catch (error) {

        console.error(
            "Load sales error:",
            error
        );

        toast(
            error.message,
            true
        );

    }
}
async function deleteSale(id) {

    if (!confirm(
        "Delete this sale?\n\nThe sold quantity will be returned to inventory."
    )) {
        return;
    }

    try {

        await api(`/admin/sales/${id}`, {
            method: "DELETE"
        });

        toast("Sale deleted successfully.");

        await loadSales();

        if (typeof loadInventory === "function") {
            await loadInventory();
        }

        if (typeof loadDashboard === "function") {
            await loadDashboard();
        }

    } catch (error) {

        console.error(
            "Delete sale error:",
            error
        );

        toast(
            error.message ||
            "Failed to delete sale.",
            true
        );
    }
}

/* ================= ADD SALE ================= */

async function saleForm() {
    try {

        const inventory =
            await api("/admin/inventory");

        const available =
            inventory.filter(
                item => Number(item.quantity) > 0
            );

        if (!available.length) {
            toast(
                "No products available in stock.",
                true
            );
            return;
        }


        openModal(
            "Add Sale",

            `
            <form class="form" id="saleForm">

                <div class="form-grid">

                    <div class="field full">

                        <label>
                            Customer
                        </label>

                        <input
                            type="text"
                            id="saleCustomerSearch"
                            placeholder="Search customer by name or phone"
                            autocomplete="off"
                        >

                        <div
                            id="customerResults"
                            style="
                                margin-top:8px;
                            "
                        ></div>

                        <input
                            type="hidden"
                            id="selectedCustomerId"
                            name="customerId"
                        >

                        <input
                            type="hidden"
                            id="selectedCustomerName"
                            name="customerName"
                        >
<input
    type="hidden"
    id="selectedCustomerEmail"
    name="customerEmail"
>
                    </div>


                    <div
                        id="selectedCustomer"
                        class="selected-customer-card"
                        style="display:none;"
                    ></div>


                    <div
                        id="addCustomerArea"
                        style="display:none;"
                    >

                        <div class="form-grid">

                            ${field(
    "Customer Name",
    "newCustomerName"
)}

${field(
    "Phone",
    "newCustomerPhone"
)}

${field(
    "Email",
    "newCustomerEmail",
    "email"
)}

                        </div>

                        <button
    type="button"
    class="secondary"
    id="addCustomerFromSale"
>
    Add Customer
</button>

                    </div>


                    <div class="field full">

                        <label>
                            Product
                        </label>

                       
                    <div class="field full">
    <label>Product</label>

    <input
        type="text"
        id="saleProductSearch"
        placeholder="Search product by name..."
        autocomplete="off"
    >

    <select
        name="productId"
        id="saleProduct"
        required
    >
        ${available.map(item => `
            <option
                value="${item.id}"
                data-price="${item.selling_price}"
                data-name="${escapeHTML(item.product_name)}"
                data-stock="${item.quantity}"
            >
                ${escapeHTML(item.product_name)}
                - ${money(item.selling_price)}
                (Stock: ${item.quantity})
            </option>
        `).join("")}
    </select>
</div>


                    ${field(
                        "Quantity",
                        "quantity",
                        "number",
                        true
                    )}


                    ${field(
                        "Discount ₹",
                        "discount",
                        "number"
                    )}


               <div class="field">

    <label>
        Payment Method
    </label>

    <select
        name="paymentMethod"
        id="paymentMethod"
        required
    >

        <option value="Cash">
            Cash
        </option>

        <option value="Online">
            Online
        </option>

    </select>
<div class="field">

    <label>
        Warranty
    </label>

    <select
        name="warrantyMonths"
        id="warrantyMonths"
    >
        <option value="0">
            No Warranty
        </option>

        <option value="3">
            3 Months
        </option>

        <option value="6">
            6 Months
        </option>
    </select>

</div>


                </div>


                <div
                    id="saleTotalPreview"
                    class="empty"
                >
                    Select product and quantity.
                </div>


                <div class="form-actions">

                    <button
                        type="button"
                        class="secondary"
                        id="cancelModal"
                    >
                        Cancel
                    </button>

                    <button
    type="submit"
    class="primary"
>
    Record Sale
</button>

                </div>

            </form>
            `
        );


        const form =
            $("saleForm");

        const select =
            $("saleProduct");

        const quantity =
            form.quantity;
            const addCustomerFromSale =
    $("addCustomerFromSale");

$("addCustomerFromSale").onclick =
    async () => {
        const name =
            form.newCustomerName.value.trim();

        const phone =
            form.newCustomerPhone.value.trim();

        const email =
            form.newCustomerEmail.value.trim();

       const warrantyMonths =
    Number($("warrantyMonths").value || 0);

if (!name || !phone) {
    toast(
        "Customer name and phone are required.",
        true
    );
    return;
}

if (
    (warrantyMonths === 3 || warrantyMonths === 6) &&
    !email
) {
    toast(
        "Customer email is required for warranty products.",
        true
    );
    return;
}

        try {
            const customer =
                await api(
                    "/admin/customers",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            name,
                            phone,
                            email,
                            address: ""
                        })
                    }
                );

            $("selectedCustomerId").value =
                customer.id;

            $("selectedCustomerName").value =
                customer.name;

            $("selectedCustomerEmail").value =
                customer.email || email || "";

            $("selectedCustomer").style.display =
                "block";

            $("selectedCustomer").innerHTML = `
                <div class="selected-customer-card">
                    <strong>
                        Customer: ${escapeHTML(customer.name)}
                    </strong>
                    <span>
                        Customer selected ✓
                    </span>
                </div>
            `;

            $("addCustomerArea").style.display =
                "none";

            $("saleCustomerSearch").value = "";

            toast("Customer added successfully.");

        } catch (error) {
            toast(error.message, true);
        }
    };

const productSearch = document.getElementById('saleProductSearch');
const productSelect = document.getElementById('saleProduct');

productSearch.addEventListener('input', () => {
    const search = productSearch.value.toLowerCase().trim();

    const options = Array.from(productSelect.options);

    options.forEach(option => {
        const productName =
            option.dataset.name?.toLowerCase() || '';

        option.hidden =
            search && !productName.includes(search);
    });

    const visible = options.find(option => !option.hidden);

    if (visible) {
        productSelect.value = visible.value;
        productSelect.dispatchEvent(new Event('change'));
    }
});
        /* ================= CUSTOMER SEARCH ================= */

        const customerSearch =
            $("saleCustomerSearch");

        const customerResults =
            $("customerResults");

        const selectedCustomer =
            $("selectedCustomer");

        const addCustomerArea =
            $("addCustomerArea");


        let searchTimer;


        customerSearch.oninput = () => {

            clearTimeout(searchTimer);

            const search =
                customerSearch.value.trim();


            if (!search) {

                customerResults.innerHTML = "";

                addCustomerArea.style.display =
                    "none";

                return;
            }


            searchTimer =
                setTimeout(async () => {

                    try {

                        const customers =
                            await api(
                                "/admin/customers?search=" +
                                encodeURIComponent(search)
                            );


                        if (!customers.length) {

                            customerResults.innerHTML = `

                                <div class="empty">

                                    No customer found.

                                    <br><br>

                                    <button
                                        type="button"
                                        class="secondary"
                                        id="showAddCustomer"
                                    >
                                        + Add New Customer
                                    </button>

                                </div>

                            `;


                            $("showAddCustomer")
                                .onclick = () => {

                                    addCustomerArea.style.display =
                                        "block";

                                    customerResults.innerHTML =
                                        "";

                                };

                            return;
                        }


                        addCustomerArea.style.display =
                            "none";


                        customerResults.innerHTML = `

                            <div
                                style="
                                    border:1px solid #ddd;
                                    border-radius:8px;
                                    overflow:hidden;
                                "
                            >

                                ${customers.map(customer => `

                                    <button
                                        type="button"
                                        class="customer-result"
                                        data-id="${customer.id}"
                                        data-name="${escapeHTML(customer.name)}"
                                        data-email="${escapeHTML(customer.email || "")}"
                                        style="
                                            display:block;
                                            width:100%;
                                            padding:10px;
                                            border:0;
                                            border-bottom:1px solid #eee;
                                            background:white;
                                            text-align:left;
                                            cursor:pointer;
                                        "
                                    >

                                        <b>
                                            ${escapeHTML(
                                                customer.name
                                            )}
                                        </b>

                                        <br>

                                        <small>
                                            ${escapeHTML(customer.phone || "")}
                                            ${customer.email
                                                ? " • " + escapeHTML(customer.email)
                                                : ""}
                                        </small>
                                    </button>

                                `).join("")}

                            </div>
                        `;


                        document
                            .querySelectorAll(
                                ".customer-result"
                            )
                            .forEach(button => {

                                button.onclick = () => {

                                    const id =
                                        button.dataset.id;

                                    const name =
                                        button.dataset.name;

                                    const email =
                                        button.dataset.email || "";

                                    $("selectedCustomerId")
                                        .value = id;

                                    $("selectedCustomerName")
                                        .value = name;

                                    $("selectedCustomerEmail")
                                        .value = email;

                                    customerSearch.value =
                                        "";


                                    customerResults.innerHTML =
                                        "";


                                    selectedCustomer
                                        .style.display =
                                        "block";


                                   selectedCustomer.innerHTML = `
    <div class="selected-customer-card">
        <strong>
            Customer: ${escapeHTML(name)}
        </strong>
        <span>
            Customer selected ✓
        </span>
    </div>
`;

                                };

                            });


                    } catch (error) {

                        toast(
                            error.message,
                            true
                        );

                    }

                }, 300);

        };


        /* ================= ADD NEW CUSTOMER ================= */


        /* ================= TOTAL ================= */

        function updateTotal() {

    const option =
        select.options[
            select.selectedIndex
        ];


    const price =
        Number(
            option?.dataset.price || 0
        );


    const qty =
        Number(
            quantity.value || 0
        );


    const subtotal =
        price * qty;


    const discount =
        Number(
            form.discount.value || 0
        );


    const total =
        Math.max(
            0,
            subtotal - discount
        );


    $("saleTotalPreview")
        .textContent =
        `Subtotal: ${money(subtotal)}
         | Discount: ${money(discount)}
         | Total: ${money(total)}`;

}


select.onchange =
    updateTotal;


quantity.oninput =
    updateTotal;


form.discount.oninput =
    updateTotal;


updateTotal();

        /* ================= SAVE SALE ================= */

      form.onsubmit = async event => {

    event.preventDefault();

    const option =
        select.options[select.selectedIndex];

    const qty =
        Number(quantity.value || 0);

    const stock =
        Number(option.dataset.stock || 0);

    if (!qty || qty < 1) {
        toast("Enter a valid quantity.", true);
        return;
    }

    if (qty > stock) {
        toast("Insufficient stock.", true);
        return;
    }

    const customerId =
        Number($("selectedCustomerId").value);

    const customerName =
        $("selectedCustomerName").value;

    const customerEmail =
        $("selectedCustomerEmail").value.trim();

    const warrantyMonths =
        Number($("warrantyMonths").value || 0);

    if (!customerId) {
        toast("Please select a customer.", true);
        return;
    }

    if (
        (warrantyMonths === 3 || warrantyMonths === 6) &&
        !customerEmail
    ) {
        toast(
            "Customer email is required for warranty products.",
            true
        );
        return;
    }

    const unitPrice =
        Number(option.dataset.price || 0);

   const data = {

    customerId: customerId,

    customerName: customerName,
    customerEmail: customerEmail,

    discount:
        Number(form.discount.value || 0),

    warrantyMonths:
        warrantyMonths,

    paymentMethod:
        $("paymentMethod").value,

    items: [
            {
                productId:
                    Number(option.value),

                productName:
                    option.dataset.name,

                quantity:
                    qty,

                unitPrice:
                    unitPrice,

                totalPrice:
                    unitPrice * qty
            }
        ]
    };

    console.log("SALE DATA:", data);

    try {

        const result =
            await api(
                "/admin/sales",
                {
                    method: "POST",
                    body: JSON.stringify(data)
                }
            );

        console.log(
            "SALE CREATED:",
            result
        );

        closeModal();

        toast("Sale recorded successfully");

        loadSales();
        loadInventory();
        loadDashboard();

    } catch (error) {

        console.error(
            "SALE ERROR:",
            error
        );

        toast(
            error.message,
            true
        );
    }
};
        $("cancelModal").onclick =
            closeModal;


    } catch (error) {

        toast(
            error.message,
            true
        );

    }
}

/* =====================================================
   WARRANTY
===================================================== */

let allWarranties = [];
let currentWarrantySearch = "";
async function loadWarranty(filteredWarranties = null) {

    try {

        const warranties =
    await api(
        "/admin/warranties"
    );

allWarranties = warranties;

const Warranties =
    filteredWarranties || warranties;

        const now =
            new Date();


        const sevenDays =
            new Date();


        sevenDays.setDate(
            sevenDays.getDate() + 7
        );


        let active = 0;
        let expiring = 0;
        let expired = 0;


        Warranties.forEach(warranty => {

            const end =
                new Date(
                    warranty.warranty_end_date
                );


            if (
                warranty.status === "Active" &&
                end >= now
            ) {

                active++;


                if (
                    end <= sevenDays
                ) {

                    expiring++;

                }

            } else {

                expired++;

            }

        });


        $("wActive").textContent =
            active;

        $("wExpiring").textContent =
            expiring;

        $("wExpired").textContent =
            expired;


        if (!Warranties.length){

            $("warrantyTable").innerHTML =
                `<div class="empty">
                    No warranty records yet.
                </div>`;

            return;
        }


        $("warrantyTable").innerHTML = `

            <table>

                <thead>

                    <tr>

                      <th>Reference</th>
<th>Customer</th>
<th>Product / Device</th>
<th>Warranty</th>
<th>Start</th>
<th>End</th>
<th>Status</th>

                    </tr>

                </thead>


                <tbody>

                    ${Warranties.map(warranty => {

                        const end =
                            new Date(
                                warranty.warranty_end_date
                            );


                        const expired =
                            end < now;


                        const expiring =
                            !expired &&
                            end <= sevenDays;


                        let badge;


                        if (expired) {

                            badge =
                                `<span class="status s-expired">
                                    Expired
                                </span>`;

                        } else if (expiring) {

                            badge =
                                `<span class="status s-pending">
                                    Expiring Soon
                                </span>`;

                        } else {

                            badge =
                                `<span class="status s-active">
                                    Active
                                </span>`;

                        }


                        return `

    <tr>

        <!-- Reference -->
        <td>
            <b>
                ${escapeHTML(
                    warranty.job_id ||
                    (
                        warranty.sale_id
                            ? `SALE #${warranty.sale_id}`
                            : "-"
                    )
                )}
            </b>
        </td>


        <!-- Customer -->
        <td>
            ${escapeHTML(
                warranty.customer_name ||
                "-"
            )}
        </td>


        <!-- Product / Device -->
        <td>
            ${escapeHTML(
                warranty.sale_product_name ||
                warranty.mobile_model ||
                "-"
            )}
        </td>


        <!-- Warranty -->
        <td>
            ${
                warranty.duration_days >= 180
                    ? "6 Months"
                    : warranty.duration_days >= 90
                        ? "3 Months"
                        : "-"
            }
        </td>


        <!-- Start -->
        <td>
            ${
                warranty.warranty_start_date
                    ? new Date(
                        warranty.warranty_start_date
                    ).toLocaleDateString()
                    : "-"
            }
        </td>


        <!-- End -->
        <td>
            ${
                warranty.warranty_end_date
                    ? new Date(
                        warranty.warranty_end_date
                    ).toLocaleDateString()
                    : "-"
            }
        </td>


        <!-- Status -->
        <td>
            ${badge}
        </td>

    </tr>

`;

                    }).join("")}

                </tbody>

            </table>

        `;

    } catch (error) {

        toast(
            error.message,
            true
        );

    }
}






/* ================= ONLINE ORDERS ================= */
async function loadOnlineOrders() {
    try {
        const orders = await api('/admin/online-orders');
        if (!orders.length) {
            $('onlineOrdersTable').innerHTML = '<div class="empty">No online orders yet.</div>';
            return;
        }
        $('onlineOrdersTable').innerHTML = `
            <table>
                <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                ${orders.map(order => `
                    <tr>
                        <td><b>${escapeHTML(order.order_number)}</b></td>
                        <td>${escapeHTML(order.customer_name)}<br><small>${escapeHTML(order.customer_phone)}</small></td>
                        <td>${(order.items || []).map(i => `${escapeHTML(i.productName)} × ${i.quantity}`).join('<br>')}</td>
                        <td>${money(order.total_amount)}</td>
                        <td><span class="status ${order.payment_status === 'Paid' ? 's-active' : 's-pending'}">${escapeHTML(order.payment_status)}</span></td>
                        <td>
                            <select
    class="order-status-select"
    onchange="updateOnlineOrderStatus(${order.id}, this.value)"
>
                                ${['Placed','Confirmed','Packed','Shipped','Delivered','Cancelled'].map(s => `<option ${s === order.order_status ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </td>
                        <td>${new Date(order.created_at).toLocaleString('en-IN')}</td>
                    </tr>
                `).join('')}
                </tbody>
            </table>`;
    } catch (error) {
        toast(error.message || 'Failed to load online orders.', true);
    }
}

async function updateOnlineOrderStatus(id, status) {
    try {
        await api(`/admin/online-orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
        toast('Order status updated.');
        await loadOnlineOrders();
    } catch (error) {
        toast(error.message || 'Failed to update order.', true);
        await loadOnlineOrders();
    }
}


/* =====================================================
   PAGE START
===================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAdminSession()) {
        return;
    }


        /* ADMIN NAME */

        try {

            const admin =
                JSON.parse(
                    localStorage.getItem(
                        "mobileCareAdmin"
                    ) || "{}"
                );


            $("adminUser").textContent =
                admin.name ||
                admin.username ||
                "Admin";

        } catch (error) {

            $("adminUser").textContent =
                "Admin";

        }


        /* SIDEBAR */

       document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.onclick = () => {

            showSection(
                button.dataset.section
            );

            // Close sidebar on mobile
            if (window.innerWidth <= 720) {
                document
                    .getElementById("sidebar")
                    .classList.remove("open");
            }

        };

    });


        /* VIEW ALL */

        document
            .querySelectorAll("[data-go]")
            .forEach(button => {

                button.onclick = () => {

                    showSection(
                        button.dataset.go
                    );

                };

            });


        /* LOGOUT */

        $("logoutBtn").onclick =
            () => {

                localStorage.removeItem(
                    "mobileCareToken"
                );

                localStorage.removeItem(
                    "mobileCareAdmin"
                );

                window.location.href =
                    "/admin-login.html";

            };


        /* MODAL */

        $("closeModal").onclick =
            closeModal;


        $("modal").onclick =
            event => {

                if (
                    event.target.id ===
                    "modal"
                ) {

                    closeModal();

                }

            };


        /* MOBILE MENU */

        $("menuBtn").onclick =
            () => {

                document
                    .querySelector(".sidebar")
                    .classList.toggle(
                        "open"
                    );

            };

document
    .querySelectorAll(".sidebar .nav-item")
    .forEach(item => {
        item.addEventListener("click", () => {
            if (window.innerWidth <= 720) {
                document
                    .querySelector(".sidebar")
                    .classList.remove("open");
            }
        });
    });
        /* CUSTOMER */
$("addCustomerBtn").onclick =
    () => customerForm();


        $("customerSearchBtn").onclick =
            loadCustomers;


        $("customerSearch").addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    loadCustomers();

                }

            }
        );


        /* REPAIRS */

        $("addRepairBtn").onclick =
            repairForm;


        $("repairSearchBtn").onclick =
            loadRepairs;


        $("repairSearch").addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    loadRepairs();

                }

            }
        );


        $("repairStatusFilter").onchange =
            loadRepairs;


        /* SALES */

        $("addSaleBtn").onclick =
            saleForm;


        /* INVENTORY */

        $("addInventoryBtn").onclick =
            inventoryForm;


        /* START DASHBOARD */

        showSection(
            "dashboard"
        );

    }
);
function searchWarranty() {

    const search =
        $("warrantySearchInput")
            .value
            .trim()
            .toLowerCase();

    if (!search) {
        loadWarranty();
        return;
    }

    const filtered =
        allWarranties.filter(warranty => {

            const name =
                String(
                    warranty.customer_name || ""
                ).toLowerCase();

            const mobile =
                String(
                    warranty.customer_phone || ""
                ).toLowerCase();

            return (
                name.includes(search) ||
                mobile.includes(search)
            );

        });

    loadWarranty(filtered);
}


function clearWarrantySearch() {

    $("warrantySearchInput").value = "";

    loadWarranty();
}