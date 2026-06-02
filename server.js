const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Login: http://localhost:${PORT}/login`);
});

// Initialize WhatsApp client only in local development
if (process.env.NODE_ENV !== 'production') {
    let waNotifier = require('./utils/waNotifier');
    waNotifier.initClient();
}