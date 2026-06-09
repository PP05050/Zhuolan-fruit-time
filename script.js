document.addEventListener("DOMContentLoaded", function() {

    const CHATBOT_GAS_URL = 'https://script.google.com/macros/s/AKfycbw7gjjlikchMadz5mhrEZJjE-QU5qBgfJRp3sbH7WYmtfyxN4KkGNsa7m7tqHoeUSLb/exec';
    const ORDER_GAS_URL = 'https://script.google.com/macros/s/AKfycbxIe23PqA_VNRXA_Tme9pu2Wp2iwvgy1LVOxzl7l2Ojq3O6qQUKIWO1t1BX83yUJhk/exec'; 

    let cart = []; 
    
    const productsDb = {
        'carambola': { name: '【特級】卓蘭正宗楊桃禮盒', price: 650 },
        'grape': { name: '【優級】卓蘭巨峰葡萄珍藏禮盒', price: 880 },
        'pear': { name: '【清甜水潤】卓蘭特選尊爵高接梨禮盒', price: 1299 }, 
        'citrus': { name: '【特級】卓蘭老欉茂谷柑文創禮盒', price: 700 }
    };

    const cartContainer = document.getElementById('cart-items-container');
    const totalPriceEl = document.getElementById('cart-total-price');
    const orderForm = document.getElementById('order-inquiry-form');
    const formStatus = document.getElementById('form-status');

    const buyButtons = document.querySelectorAll('.buy-btn');
    buyButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault(); 
            const ctaName = this.getAttribute('data-cta-name');
            let productId = '';
            
            if (ctaName.includes('Carambola')) productId = 'carambola';
            else if (ctaName.includes('Grape')) productId = 'grape';
            else if (ctaName.includes('Pear')) productId = 'pear'; 
            else if (ctaName.includes('Citrus')) productId = 'citrus';

            if (productId) {
                addToCart(productId);
                alert(`已將 ${productsDb[productId].name} 加入預購清單！`);
                
                if (typeof gtag === 'function') {
                    gtag('event', 'add_to_cart', {
                        currency: 'TWD',
                        value: productsDb[productId].price,
                        items: [{
                            item_id: productId,
                            item_name: productsDb[productId].name,
                            price: productsDb[productId].price,
                            quantity: 1
                        }]
                    });
                }
                
                document.getElementById('cta-form').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    function addToCart(id) {
        const existingItem = cart.find(item => item.id === id);
        if (existingItem) {
            existingItem.qty += 1;
        } else {
            cart.push({ id: id, name: productsDb[id].name, price: productsDb[id].price, qty: 1 });
        }
        renderCart();
    }

    function updateQty(id, change) {
        const item = cart.find(item => item.id === id);
        if (item) {
            item.qty += change;
            if (item.qty <= 0) {
                cart = cart.filter(i => i.id !== id);
            }
            renderCart();
        }
    }

    function renderCart() {
        if (!cartContainer) return;
        cartContainer.innerHTML = ''; 
        let total = 0;

        if (cart.length === 0) {
            cartContainer.innerHTML = '<p class="empty-cart-msg">目前購物車是空的，請至上方精選推薦加入商品。</p>';
        } else {
            cart.forEach(item => {
                total += item.price * item.qty;
                const itemDiv = document.createElement('div');
                itemDiv.className = 'cart-item';
                itemDiv.innerHTML = `
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-controls">
                        <span>NT$ ${item.price}</span>
                        <button type="button" class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
                        <span>${item.qty}</span>
                        <button type="button" class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
                    </div>
                `;
                cartContainer.appendChild(itemDiv);
            });
        }
        if (totalPriceEl) totalPriceEl.textContent = `NT$ ${total}`;
    }

    window.updateQty = updateQty;

    let hasStartedCheckout = false;
    if (orderForm) {
        orderForm.addEventListener('input', function() {
            if (!hasStartedCheckout && cart.length > 0) {
                hasStartedCheckout = true;
                let checkoutTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
                let checkoutItems = cart.map(item => ({
                    item_id: item.id,
                    item_name: item.name,
                    price: item.price,
                    quantity: item.qty
                }));
                
                if (typeof gtag === 'function') {
                    gtag('event', 'begin_checkout', {
                        currency: 'TWD',
                        value: checkoutTotal,
                        items: checkoutItems
                    });
                }
            }
        });

        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const address = document.getElementById('address').value.trim(); 
            const message = document.getElementById('message').value.trim();
            
            if (!name || !phone || !address) {
                showStatus("請確認姓名、電話與配送地址皆已填寫。", "error");
                return;
            }

            if (cart.length === 0) {
                showStatus("您的購物車是空的，請先選擇商品喔！", "error");
                return;
            }

            let orderDetails = cart.map(item => `${item.name} x ${item.qty}`).join('\n');
            let orderTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            
            const gaItems = cart.map(item => ({
                item_id: item.id,
                item_name: item.name,
                price: item.price,
                quantity: item.qty
            }));

            const payload = {
                name: name,
                phone: phone,
                address: address, 
                cartDetails: orderDetails,
                totalPrice: orderTotal,
                message: message
            };

            showStatus("訂單傳送中，請稍候...", "processing");
            const submitBtn = orderForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            fetch(ORDER_GAS_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            })
            .then(response => response.json())
            .then(data => {
                if(data.status === "success") {
                    showStatus(`感謝您，${name}！您的預購單已成功送出，專人將盡快聯繫您。`, "success");
                    
                    if (typeof gtag === 'function') {
                        const transactionId = 'T-' + new Date().getTime();
                        gtag('event', 'purchase', {
                            transaction_id: transactionId,
                            value: orderTotal,
                            currency: 'TWD',
                            items: gaItems
                        });
                    }
                    
                    orderForm.reset();
                    cart = []; 
                    renderCart();
                    hasStartedCheckout = false;
                } else {
                    showStatus("發生錯誤，請稍後再試。", "error");
                }
            })
            .catch(error => {
                showStatus("連線異常，請確認網路狀態。", "error");
            })
            .finally(() => { submitBtn.disabled = false; });
        });
    }

    function showStatus(msg, type) {
        formStatus.style.display = "block";
        formStatus.textContent = msg;
        if (type === "error") {
            formStatus.style.backgroundColor = "#FEE2E2";
            formStatus.style.color = "#991B1B";
        } else if (type === "success") {
            formStatus.style.backgroundColor = "#D1FAE5";
            formStatus.style.color = "#065F46";
        } else {
            formStatus.style.backgroundColor = "#E5E7EB";
            formStatus.style.color = "#374151";
        }
    }
    
    const trackButtons = document.querySelectorAll('.track-cta');
    trackButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ctaName = this.getAttribute('data-cta-name');
            if (typeof gtag === 'function') {
                gtag('event', 'cta_click', {
                    'event_category': 'Engagement',
                    'event_label': ctaName,
                    'value': 1
                });
            }
        });
    });

    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const currentItem = this.parentElement;
            document.querySelectorAll('.faq-item').forEach(item => {
                if (item !== currentItem) item.classList.remove('active');
            });
            currentItem.classList.toggle('active');
        });
    });

    const chatToggleBtn = document.getElementById('chat-toggle-btn');
    const chatWidget = document.getElementById('chat-widget');
    const closeChatBtn = document.getElementById('close-chat');
    const sendChatBtn = document.getElementById('send-chat');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (chatToggleBtn && chatWidget) {
        chatToggleBtn.addEventListener('click', () => chatWidget.classList.toggle('open'));
        closeChatBtn.addEventListener('click', () => chatWidget.classList.remove('open'));

        function sendMessage() {
            const text = chatInput.value.trim();
            if (!text) return;

            appendMessage(text, 'user-message');
            chatInput.value = '';

            const loadingId = 'loading-' + Date.now();
            const loadingDiv = document.createElement('div');
            loadingDiv.id = loadingId;
            loadingDiv.className = 'message loading-message';
            loadingDiv.textContent = '助理思考中...';
            chatMessages.appendChild(loadingDiv);
            scrollToBottom();

            fetch(CHATBOT_GAS_URL, {
                method: 'POST',
                body: JSON.stringify({ message: text }),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById(loadingId).remove();
                appendMessage(data.reply, 'bot-message');
            })
            .catch(error => {
                document.getElementById(loadingId).remove();
                appendMessage('連線發生錯誤，請確認網路狀態。', 'bot-message');
            });
        }

        sendChatBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

        function appendMessage(text, className) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message ' + className;
            msgDiv.textContent = text;
            chatMessages.appendChild(msgDiv);
            scrollToBottom();
        }
        function scrollToBottom() { chatMessages.scrollTop = chatMessages.scrollHeight; }
    }

    const currentMonth = new Date().getMonth() + 1; 
    const fruitSeasons = {
        'citrus': [11, 12, 1, 2, 3, 4, 5],
        'carambola': [9, 10, 11, 12, 1, 2, 3, 4],
        'grape': [7, 8, 9, 12, 1, 2],
        'pear': [5, 6, 7, 9, 10]
    };

    function updateSeasonalElements() {
        document.querySelectorAll('#season-calendar tbody tr').forEach(row => {
            const fruit = row.getAttribute('data-fruit');
            if (fruit && fruitSeasons[fruit].includes(currentMonth)) {
                row.classList.add('active-season');
                const nameCell = row.querySelector('.fruit-name');
                if (nameCell && !nameCell.querySelector('.current-tag')) {
                    nameCell.innerHTML += ' <span class="current-tag">當季</span>';
                }
            }
        });

        document.querySelectorAll('.product-tag-container').forEach(container => {
            const fruit = container.getAttribute('data-fruit');
            if (fruit && fruitSeasons[fruit].includes(currentMonth)) {
                container.innerHTML = '<span class="product-tag hot">當季首選</span>';
            }
        });
    }

    updateSeasonalElements();

    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mainNav = document.getElementById('main-nav');

    if (hamburgerBtn && mainNav) {
        hamburgerBtn.addEventListener('click', function() {
            mainNav.classList.toggle('active');
        });

        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    mainNav.classList.remove('active');
                }
            });
        });
    }
});
