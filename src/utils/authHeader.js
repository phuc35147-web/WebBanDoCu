function parseBearerToken(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const match = raw.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    const token = match[1].trim();
    return token || null;
}

module.exports = { parseBearerToken };
