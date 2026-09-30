/* Cmail — app.js v4 — Empty inbox, clean */

const COLORS=['#1a73e8','#ea4335','#fbbc04','#34a853','#8e24aa','#e91e63','#00acc1','#f4511e'];
function avatarColor(n){let h=0;for(let i=0;i<n.length;i++)h=n.charCodeAt(i)+((h<<5)-h);return COLORS[Math.abs(h)%COLORS.length];}
function initials(n){return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);}

// Empty — user will add emails via compose
const emails = [];

let currentFolder = 'inbox';
const emailListEl = document.getElementById('email-list');
const emailDetailEl = document.getElementById('email-detail');
const listToolbar = document.getElementById('list-toolbar');
const detailToolbar = document.getElementById('detail-toolbar');
const pageInfoEl = document.getElementById('page-info');
const searchInput = document.getElementById('search-input');
const sidebar = document.getElementById('sidebar');
const composeWindow = document.getElementById('compose-window');

// Sidebar toggle
document.getElementById('menu-btn').addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

function renderList(filter = '') {
    emailListEl.style.display = 'block';
    emailDetailEl.style.display = 'none';
    listToolbar.style.display = 'flex';
    detailToolbar.style.display = 'none';
    emailListEl.innerHTML = '';

    const filtered = emails.filter(e => {
        const f = e.folder === currentFolder;
        const m = !filter || e.sender.toLowerCase().includes(filter) || e.subject.toLowerCase().includes(filter) || e.preview.toLowerCase().includes(filter);
        return f && m;
    });

    const inboxN = emails.filter(e => e.folder === 'inbox').length;
    const spamN = emails.filter(e => e.folder === 'spam').length;
    const sentN = emails.filter(e => e.folder === 'sent').length;
    document.getElementById('inbox-count').textContent = inboxN || '';
    document.getElementById('spam-count').textContent = spamN || '';
    document.getElementById('sent-count').textContent = sentN || '';
    pageInfoEl.textContent = filtered.length > 0 ? `1–${filtered.length} of ${filtered.length}` : '';

    if (filtered.length === 0) {
        emailListEl.innerHTML = '<div class="list-empty"><span class="material-icons-outlined">markunread_mailbox</span><p>No messages in this folder.</p></div>';
        return;
    }

    filtered.forEach(email => {
        const row = document.createElement('div');
        row.className = `email-row ${email.isUnread ? 'unread' : 'read'}`;
        const starIcon = email.starred ? 'star' : 'star_border';
        const starClass = email.starred ? 'starred' : '';
        const spam = email.folder === 'spam' ? '<span class="spam-label">SPAM</span>' : '';
        row.innerHTML = `
            <div class="row-checkbox"><input type="checkbox"></div>
            <div class="row-star ${starClass}"><span class="material-icons-outlined">${starIcon}</span></div>
            <div class="row-sender">${email.sender}</div>
            <div class="row-content">${spam}<span class="row-subject">${email.subject}</span><span class="row-separator">—</span><span class="row-preview">${email.preview}</span></div>
            <div class="row-date">${email.date}</div>`;
        row.querySelector('.row-star').addEventListener('click', ev => { ev.stopPropagation(); email.starred = !email.starred; renderList(searchInput.value.toLowerCase()); });
        row.addEventListener('click', ev => { if (ev.target.closest('.row-checkbox')) return; email.isUnread = false; openDetail(email); });
        emailListEl.appendChild(row);
    });
}

function openDetail(email) {
    emailListEl.style.display = 'none';
    emailDetailEl.style.display = 'flex';
    listToolbar.style.display = 'none';
    detailToolbar.style.display = 'flex';
    document.getElementById('detail-subject').textContent = email.subject;
    document.getElementById('detail-folder-label').textContent = email.folder === 'spam' ? 'Spam' : email.folder === 'sent' ? 'Sent' : 'Inbox';
    document.getElementById('detail-sender-name').textContent = email.sender;
    document.getElementById('detail-sender-email').textContent = `<${email.senderEmail}>`;
    document.getElementById('detail-date').textContent = email.fullDate;
    document.getElementById('detail-body').textContent = email.body;
    const av = document.getElementById('detail-avatar');
    av.textContent = initials(email.sender);
    av.style.background = avatarColor(email.sender);
}

document.getElementById('back-btn').addEventListener('click', () => renderList(searchInput.value.toLowerCase()));

document.querySelectorAll('.folder-list li').forEach(li => {
    li.addEventListener('click', () => {
        document.querySelectorAll('.folder-list li').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        currentFolder = li.getAttribute('data-folder');
        renderList(searchInput.value.toLowerCase());
    });
});

searchInput.addEventListener('input', e => renderList(e.target.value.toLowerCase()));
document.getElementById('refresh-btn').addEventListener('click', () => showSnackbar('Checking for new messages...'));

// Compose
document.getElementById('compose-btn').addEventListener('click', () => {
    composeWindow.classList.add('open');
    document.getElementById('compose-from').value = '';
    document.getElementById('compose-subject').value = '';
    document.getElementById('compose-message').value = '';
    setTimeout(() => document.getElementById('compose-from').focus(), 100);
});
document.getElementById('compose-close').addEventListener('click', () => composeWindow.classList.remove('open'));
document.getElementById('compose-minimize').addEventListener('click', () => composeWindow.classList.remove('open'));

// Send
document.getElementById('send-btn').addEventListener('click', async () => {
    const from = document.getElementById('compose-from').value.trim();
    const subject = document.getElementById('compose-subject').value.trim();
    const body = document.getElementById('compose-message').value.trim();
    
    if (!from || !subject || !body) { 
        showSnackbar('Lütfen tüm alanları doldurun.'); 
        return; 
    }
    try {
        showSnackbar('Yapay Zeka İnceliyor...');
        const response = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: body })
        });
        const result = await response.json();

        const isSpam = result.is_spam;
        const conf = result.confidence;
        
        const folder = isSpam ? 'spam' : 'inbox';
        const senderName = from.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
       
        emails.unshift({
            id: Date.now(), sender: senderName, senderEmail: from,
            subject, preview: body.substring(0, 120), body,
            date: 'Az önce',
            fullDate: new Date().toLocaleString('tr-TR', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
            folder, isUnread: true, starred: false
        });

        composeWindow.classList.remove('open');
        currentFolder = folder;
        
        document.querySelectorAll('.folder-list li').forEach(el => {
            el.classList.remove('active');
            if (el.getAttribute('data-folder') === folder) el.classList.add('active');
        });
        
        renderList();
        
      
        showSnackbar(isSpam 
            ? `SPAM TESPİT EDİLDİ! (%${conf} emin) → Spam Kutusuna Taşındı` 
            : `Inbox'a İletildi (%${conf} Güvenli)`
        );
    } catch (error) {
        console.error("Bağlantı hatası:", error);
        showSnackbar("Backend'e ulaşılamadı! Uvicorn çalışıyor mu?");
    }
});



function showSnackbar(msg) {
    const el = document.getElementById('snackbar');
    document.getElementById('snackbar-text').textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 4000);
}

detailToolbar.style.display = 'none';
renderList();
