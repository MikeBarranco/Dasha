const http = require('http'); http.get({hostname: 'localhost', port: 3000, path: '/api/v1/me', headers: { Cookie: 'token=FAKE_TOKEN' }}, (res) => { res.on('data', d => process.stdout.write(d)) })
