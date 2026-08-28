const state = {
    products: [],
    cart: JSON.parse(localStorage.getItem('mobileCareCart') || '[]')
};

const $ = id => document.getElementById(id);

const money = value =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(Number(value || 0));

const save = () =>
    localStorage.setItem(
        'mobileCareCart',
        JSON.stringify(state.cart)
    );


// ==========================================
// LOAD PRODUCTS
// ==========================================

async function loadProducts() {
    const q = new URLSearchParams();

    const search = $('search').value.trim();
    const category = $('category').value;

    if (search) {
        q.set('search', search);
    }

    if (category) {
        q.set('category', category);
    }

    const r = await fetch(
        '/api/public/store/products?' + q
    );

    state.products = await r.json();

    renderProducts();
}


// ==========================================
// RENDER PRODUCTS
// ==========================================

function renderProducts() {

    if (!state.products.length) {
        $('products').innerHTML =
            '<div class="empty">No products found.</div>';

        return;
    }

    $('products').innerHTML = state.products.map(p => {

        const stock = Number(p.quantity || 0);
        const outOfStock = stock <= 0;
        const lowStock = stock > 0 && stock <= 3;

        return `
            <article class="product ${outOfStock ? 'product-out-of-stock' : ''}">

                <div class="product-img ${outOfStock ? 'out-of-stock-img' : ''}">

                    ${
                        p.image_url
                            ? `
                                <img
                                    src="${escapeHtml(p.image_url)}"
                                    alt="${escapeHtml(p.product_name)}"
                                >
                            `
                            : '📱'
                    }

                    ${
                        outOfStock
                            ? `
                                <div class="out-stock-overlay">
                                    <span>OUT OF STOCK</span>
                                </div>
                            `
                            : ''
                    }

                </div>


                <div class="product-body">

                    <span class="tag">
                        ${escapeHtml(p.category)}
                    </span>


                    <h3>
                        <a
                            href="/product.html?id=${p.id}"
                            style="color:inherit;text-decoration:none"
                        >
                            ${escapeHtml(p.product_name)}
                        </a>
                    </h3>


                    <div class="brand-text">
                        ${escapeHtml(p.brand || 'Mobile Care')}
                    </div>


                    <div class="price">
                        ${money(p.selling_price)}
                    </div>


                    ${
                        outOfStock
                            ? `
                                <div class="stock stock-out">
                                    🔴 Out of Stock
                                </div>
                            `
                            : lowStock
                                ? `
                                    <div class="stock stock-low">
                                        🟡 Only ${stock} available
                                    </div>
                                `
                                : `
                                    <div class="stock stock-in">
                                        🟢 ${stock} available
                                    </div>
                                `
                    }


                    <div class="product-actions">

                        ${
                            outOfStock
                                ? `
                                    <button
                                        class="primary out-stock-btn"
                                        disabled
                                    >
                                        Out of Stock
                                    </button>
                                `
                                : `
                                    <button
                                        class="primary"
                                        onclick="addToCart(${p.id})"
                                    >
                                        Add to Cart
                                    </button>
                                `
                        }


                        ${
                            p.instagram_url
                                ? `
                                   <a
    class="instagram-product-btn"
    href="${escapeHtml(p.instagram_url)}"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="View ${escapeHtml(p.product_name)} on Instagram"
    title="View on Instagram"
>
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        />
        <circle
            cx="12"
            cy="12"
            r="4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
        />
        <circle
            cx="17.5"
            cy="6.5"
            r="1"
            fill="currentColor"
        />
    </svg>
</a>
                                `
                                : ''
                        }

                    </div>

                </div>

            </article>
        `;

    }).join('');
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {

    return String(value ?? '').replace(
        /[&<>"']/g,
        character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[character])
    );
}


// ==========================================
// ADD TO CART
// ==========================================

function addToCart(id) {

    const product = state.products.find(
        item => Number(item.id) === Number(id)
    );

    if (!product) {
        return;
    }

    const stock = Number(product.quantity || 0);

    // Prevent adding an out-of-stock product
    if (stock <= 0) {
        alert('This product is currently out of stock.');
        return;
    }

    const existing = state.cart.find(
        item => Number(item.productId) === Number(id)
    );


    if (existing) {

        if (existing.quantity >= stock) {
            return alert(
                'Maximum available stock reached.'
            );
        }

        existing.quantity++;

    } else {

        state.cart.push({
            productId: product.id,
            productName: product.product_name,
            unitPrice: Number(product.selling_price),
            quantity: 1,
            maxStock: stock
        });

    }

    save();
    renderCart();
    openCart();
}


// ==========================================
// CART TOTAL
// ==========================================

function cartTotal() {

    return state.cart.reduce(
        (sum, item) =>
            sum + item.unitPrice * item.quantity,
        0
    );
}


// ==========================================
// RENDER CART
// ==========================================

function renderCart() {

    $('cartCount').textContent =
        state.cart.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

    $('cartTotal').textContent =
        money(cartTotal());

    $('checkoutTotal').textContent =
        money(cartTotal());


    $('cartItems').innerHTML = state.cart.length

        ? state.cart.map((item, index) => `

            <div class="cart-item">

                <div>
                    <b>
                        ${escapeHtml(item.productName)}
                    </b>

                    <br>

                    <small>
                        ${money(item.unitPrice)}
                        ×
                        ${item.quantity}
                    </small>
                </div>


                <div>

                    <button
                        class="secondary"
                        onclick="changeQty(${index}, -1)"
                    >
                        −
                    </button>

                    <button
                        class="secondary"
                        onclick="changeQty(${index}, 1)"
                    >
                        +
                    </button>

                </div>

            </div>

        `).join('')

        : '<p class="muted">Your cart is empty.</p>';
}


// ==========================================
// CHANGE CART QUANTITY
// ==========================================

function changeQty(index, difference) {

    const item = state.cart[index];

    if (!item) {
        return;
    }

    item.quantity += difference;


    if (item.quantity <= 0) {

        state.cart.splice(index, 1);

    } else if (item.quantity > item.maxStock) {

        item.quantity = item.maxStock;

        alert('Maximum available stock reached.');
    }


    save();
    renderCart();
}


// ==========================================
// CART DRAWER
// ==========================================

function openCart() {

    $('drawer').classList.remove('hidden');
    $('overlay').classList.remove('hidden');
}


function closeCart() {

    $('drawer').classList.add('hidden');
    $('overlay').classList.add('hidden');
}


// ==========================================
// EVENT LISTENERS
// ==========================================

$('cartBtn').onclick = openCart;

$('closeCart').onclick = closeCart;

$('overlay').onclick = closeCart;

$('search').oninput = loadProducts;

$('category').onchange = loadProducts;


// ==========================================
// CHECKOUT
// ==========================================

$('checkoutBtn').onclick = () => {

    if (!state.cart.length) {
        return alert('Add a product first.');
    }

    closeCart();

    $('checkoutModal').classList.remove('hidden');
};


$('closeCheckout').onclick = () =>
    $('checkoutModal').classList.add('hidden');


// ==========================================
// CHECKOUT FORM
// ==========================================

$('checkoutForm').onsubmit = async e => {

    e.preventDefault();

    const form = e.target;
    const message = $('checkoutMessage');

    message.textContent =
        'Creating secure payment...';


    try {

        const r = await fetch(
            '/api/public/store/create-order',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    customerName:
                        form.name.value,

                    customerPhone:
                        form.phone.value,

                    customerEmail:
                        form.email.value,

                    deliveryAddress:
                        form.address.value,

                    items:
                        state.cart.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity
                        }))

                })
            }
        );


        const data = await r.json();


        if (!r.ok) {
            throw new Error(data.message);
        }


        const options = {

            key: data.razorpayKeyId,

            amount:
                Math.round(data.amount * 100),

            currency: 'INR',

            name: 'Mobile Care',

            description:
                `Order ${data.orderNumber}`,

            order_id:
                data.razorpayOrderId,

            prefill:
                data.customer,

            theme: {
                color: '#1769e0'
            },
            modal: {
    ondismiss: function () {
        showPaymentCancelled();
    }
},

            
            handler: async response => {

                message.textContent =
                    'Verifying payment...';


                const vr = await fetch(
                    '/api/public/store/verify-payment',
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({

                            orderNumber:
                                data.orderNumber,

                            razorpayOrderId:
                                response.razorpay_order_id,

                            razorpayPaymentId:
                                response.razorpay_payment_id,

                            razorpaySignature:
                                response.razorpay_signature

                        })
                    }
                );


                const vd = await vr.json();


                if (!vr.ok) {
                    throw new Error(vd.message);
                }


                localStorage.removeItem(
                    'mobileCareCart'
                );

                state.cart = [];

                renderCart();


                window.location.href =
                    `/order-success.html?order=${encodeURIComponent(
                        data.orderNumber
                    )}`;
            }
        };


        new Razorpay(options).open();

    } catch (error) {

        message.textContent =
            error.message ||
            'Payment could not be started.';
    }
};

function showPaymentCancelled() {
    const popup = document.createElement("div");

    popup.innerHTML = `
        <div class="payment-popup-overlay">
            <div class="payment-popup">
                <div class="payment-popup-icon">✕</div>

                <h2>Payment Cancelled</h2>

                <p>
                    Your payment was cancelled.<br>
                    No amount has been charged.
                </p>

                <button onclick="closePaymentCancelled()">
                    Try Again
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    setTimeout(() => {
        popup.remove();
    }, 6000);
}


function closePaymentCancelled() {
    const popup = document.querySelector(".payment-popup-overlay");

    if (popup) {
        popup.remove();
    }

    const message = document.getElementById("checkoutMessage");

    if (message) {
        message.textContent = "";
        message.style.display = "";
    }
}
// ==========================================
// USE MY LOCATION
// ==========================================

$('useLocationBtn').onclick = () => {

    const button = $('useLocationBtn');
    const address = $('deliveryAddress');
    const status = $('locationStatus');

    if (!navigator.geolocation) {
        status.textContent =
            'Location is not supported by this browser.';
        return;
    }

    button.disabled = true;
    button.textContent = '📍 Getting location...';
    status.textContent = 'Please allow location access...';

    navigator.geolocation.getCurrentPosition(
        async position => {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;

            status.textContent =
                'Finding your address...';

            try {

                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`
                );

                if (!response.ok) {
                    throw new Error(
                        'Unable to find address'
                    );
                }

                const data =
                    await response.json();

                const a = data.address || {};

                const parts = [
                    a.house_number,
                    a.road,
                    a.neighbourhood,
                    a.suburb,
                    a.city ||
                    a.town ||
                    a.village,
                    a.state,
                    a.postcode
                ].filter(Boolean);

                address.value =
                    parts.join(', ');

                status.textContent =
                    '✓ Location added successfully';

            } catch (error) {

                console.error(
                    'Location error:',
                    error
                );

                address.value =
                    `Latitude: ${latitude}, Longitude: ${longitude}`;

                status.textContent =
                    'Location found, but address could not be loaded.';
            }

            button.disabled = false;
            button.textContent =
                '📍 Use My Location';
        },

        error => {

            button.disabled = false;
            button.textContent =
                '📍 Use My Location';

            if (error.code === 1) {
                status.textContent =
                    'Location permission was denied.';
            } else if (error.code === 2) {
                status.textContent =
                    'Unable to determine your location.';
            } else {
                status.textContent =
                    'Location request timed out.';
            }
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
};
// ==========================================
// INITIAL LOAD
// ==========================================

(async function () {

    try {

        const r = await fetch(
            '/api/public/store/products'
        );

        state.products = await r.json();


        const categories = [
            ...new Set(
                state.products
                    .map(product => product.category)
                    .filter(Boolean)
            )
        ];


        $('category').innerHTML =
            '<option value="">All categories</option>' +

            categories
                .map(category =>
                    `<option value="${escapeHtml(category)}">
                        ${escapeHtml(category)}
                    </option>`
                )
                .join('');


        renderProducts();
        renderCart();

    } catch (error) {

        $('products').innerHTML =
            '<div class="empty">Unable to load the store.</div>';
    }

})();

async function loadPublicShopInfo() {
    try {
        const response = await fetch('/api/public/shop-info');

        if (!response.ok) return;

        const shop = await response.json();

        if (!shop) return;

        const name = document.getElementById('publicShopName');
        const email = document.getElementById('publicShopEmail');
        const contact = document.getElementById('publicShopContact');
        const timing = document.getElementById('publicShopTiming');
        const address = document.getElementById('publicShopAddress');

        if (name) name.textContent = shop.shop_name || 'Mobile Care';
        if (email) email.textContent = shop.email || '—';
        if (contact) contact.textContent = shop.contact_number || '—';
        if (timing) timing.textContent = shop.shop_timing || '—';
        if (address) address.textContent = shop.address || '—';

    } catch (error) {
        console.error('Failed to load shop information:', error);
    }
}

loadPublicShopInfo();

