let client = null;
let ready = false;
let initError = null;

function initClient() {
    if (process.env.NODE_ENV === 'production') return;
    try {
        const { Client, LocalAuth } = require('whatsapp-web.js');
        const qrcode = require('qrcode-terminal');
        client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
            }
        });

        client.on('qr', qr => {
            console.log('\n╔══════════════════════════════════════════╗');
            console.log('║   SCAN QR CODE INI DENGAN WHATSAPP ANDA  ║');
            console.log('║   (WA Pangkalan → Linked Devices)        ║');
            console.log('╚══════════════════════════════════════════╝');
            qrcode.generate(qr, { small: true });
        });

        client.on('ready', () => {
            ready = true;
            initError = null;
            console.log('\n✅ [WA] WhatsApp client siap! Notifikasi otomatis aktif.\n');
        });

        client.on('disconnected', reason => {
            ready = false;
            console.log(`\n❌ [WA] WhatsApp client terputus: ${reason}\n`);
        });

        client.on('auth_failure', msg => {
            ready = false;
            initError = msg;
            console.error(`\n❌ [WA] Gagal autentikasi: ${msg}\n`);
        });

        client.initialize();
    } catch (err) {
        initError = err.message;
        console.error('\n❌ [WA] Gagal inisialisasi WhatsApp client:', err.message);
        console.error('   Pastikan Chromium terinstall. Coba jalankan: npx puppeteer browsers install chrome\n');
    }
}

async function kirimPesan(noTujuan, pesan) {
    if (!client) {
        console.log('[WA] Client belum dibuat. Notifikasi gagal.');
        return false;
    }
    if (!ready) {
        console.log('[WA] Client belum siap' + (initError ? ' (error: ' + initError + ')' : ' (QR belum discan)') + '. Pesan tidak terkirim.');
        return false;
    }
    try {
        let formattedNo = noTujuan.replace(/[^0-9]/g, '');
        if (formattedNo.startsWith('0')) {
            formattedNo = '62' + formattedNo.slice(1);
        }
        if (!formattedNo.startsWith('62')) {
            formattedNo = '62' + formattedNo;
        }
        formattedNo += '@c.us';

        await client.sendMessage(formattedNo, pesan);
        console.log('[WA] ✅ Notifikasi terkirim ke', noTujuan);
        return true;
    } catch (err) {
        console.error('[WA] ❌ Gagal kirim pesan:', err.message);
        return false;
    }
}

async function kirimNotifikasiPesanan(namaPembeli, alamat, produk, jumlah) {
    let { WebsiteInfo } = require('../models');
    let info = await WebsiteInfo.findOne();
    let noTujuan = info ? info.phone : '085221228806';

    let pesan = `🚚 *PESANAN BARU - PENGANTARAN*\n\n` +
        `Pelanggan: ${namaPembeli}\n` +
        `Alamat: ${alamat}\n` +
        `Produk: ${produk} x${jumlah}\n\n` +
        `_Segera antar ke alamat di atas._`;

    console.log('[WA] Mengirim notifikasi ke', noTujuan, 'untuk', namaPembeli);
    return kirimPesan(noTujuan, pesan);
}

module.exports = { initClient, kirimPesan, kirimNotifikasiPesanan, getClient: () => client, isReady: () => ready };
