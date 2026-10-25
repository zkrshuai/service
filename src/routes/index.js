import { Router } from 'express'
import authRoutes from './auth.js'
import resumeRoutes from './resume.js'
import companyRoutes from './company.js'
import jobRoutes from './job.js'
import applicationRoutes from './application.js'
import invitationRoutes from './invitation.js'
import favoriteRoutes from './favorite.js'
import notificationRoutes from './notification.js'
import adminRoutes from './admin.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/resume', resumeRoutes)
router.use('/company', companyRoutes)
router.use('/jobs', jobRoutes)
router.use('/applications', applicationRoutes)
router.use('/invitations', invitationRoutes)
router.use('/favorites', favoriteRoutes)
router.use('/notifications', notificationRoutes)
router.use('/admin', adminRoutes)

export default router
