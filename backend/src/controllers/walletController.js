import { nanoid } from 'nanoid'
import { TopupRequest } from '../models/TopupRequest.js'
import { User } from '../models/User.js'

function sanitizeUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        wallet: user.wallet,
    }
}

export async function getMyWallet(req, res) {
    const user = await User.findById(req.user._id)
    return res.json({ wallet: user ? user.wallet : 0 })
}

export async function createTopupRequest(req, res) {
    const { amount, upiRef, phone } = req.body

    if (!amount || !upiRef || !phone) {
        return res.status(400).json({ message: 'Amount, UPI ref and phone are required' })
    }

    if (!req.file) {
        return res.status(400).json({ message: 'Payment screenshot is required' })
    }

    const request = await TopupRequest.create({
        requestId: `REQ-${Math.floor(1000 + Math.random() * 9000)}-${nanoid(4)}`,
        userId: req.user._id,
        userName: req.user.name,
        amount: Number(amount),
        upiRef,
        phone,
        screenshotName: req.file.originalname,
        screenshotUrl: `/uploads/${req.file.filename}`,
        status: 'Pending',
    })

    return res.status(201).json({
        id: request.requestId,
        userId: request.userId,
        userName: request.userName,
        amount: request.amount,
        upiRef: request.upiRef,
        phone: request.phone,
        screenshotName: request.screenshotName,
        screenshotUrl: request.screenshotUrl,
        status: request.status,
        createdAt: request.createdAt,
    })
}

export async function getMyTopupRequests(req, res) {
    const requests = await TopupRequest.find({ userId: req.user._id }).sort({ createdAt: -1 })
    const data = requests.map((request) => ({
        id: request.requestId,
        userId: request.userId,
        userName: request.userName,
        amount: request.amount,
        upiRef: request.upiRef,
        phone: request.phone,
        screenshotName: request.screenshotName,
        screenshotUrl: request.screenshotUrl,
        status: request.status,
        createdAt: request.createdAt,
        processedAt: request.processedAt,
    }))

    return res.json(data)
}

export async function getAdminTopupRequests(_req, res) {
    const requests = await TopupRequest.find().populate('userId', 'role').sort({ createdAt: -1 })
    const data = requests.map((request) => ({
        id: request.requestId,
        userId: request.userId._id,
        userRole: request.userId.role,
        userName: request.userName,
        amount: request.amount,
        upiRef: request.upiRef,
        phone: request.phone,
        screenshotName: request.screenshotName,
        screenshotUrl: request.screenshotUrl,
        status: request.status,
        createdAt: request.createdAt,
        processedAt: request.processedAt,
    }))

    return res.json(data)
}

export async function getAdminUsers(_req, res) {
    const users = await User.find().sort({ createdAt: -1 })
    return res.json(users.map((item) => sanitizeUser(item)))
}

export async function approveTopupRequest(req, res) {
    const request = await TopupRequest.findOne({ requestId: req.params.id })
    if (!request) {
        return res.status(404).json({ message: 'Request not found' })
    }

    if (request.status !== 'Pending') {
        return res.status(400).json({ message: 'Request already processed' })
    }

    const user = await User.findById(request.userId)
    if (!user) {
        return res.status(404).json({ message: 'User not found' })
    }

    user.wallet += Number(request.amount)
    request.status = 'Approved'
    request.processedAt = new Date()

    await Promise.all([user.save(), request.save()])

    return res.json({
        request: {
            id: request.requestId,
            status: request.status,
            processedAt: request.processedAt,
        },
        user: sanitizeUser(user),
    })
}

export async function rejectTopupRequest(req, res) {
    const request = await TopupRequest.findOne({ requestId: req.params.id })
    if (!request) {
        return res.status(404).json({ message: 'Request not found' })
    }

    if (request.status !== 'Pending') {
        return res.status(400).json({ message: 'Request already processed' })
    }

    request.status = 'Rejected'
    request.processedAt = new Date()
    await request.save()

    return res.json({
        request: {
            id: request.requestId,
            status: request.status,
            processedAt: request.processedAt,
        },
    })
}