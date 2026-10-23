import api from "./api";

export function getAccesssToken({ email, password }) {
    return api.post('/token/', { email, password })
}

export function getRefreshToken({ refreshToken }) {
    return api.post('/token/refresh/', { refresh: refreshToken })
}

export function verifyToken({ accessToken }) {
    return api.post('/token/verify/', { token: accessToken })
}

export function register({ email, password }) {
    return api.post('/register/', { email, password })
}