const express = require('express')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Admin')
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
})

const isCoach = require('../middlewares/isCoach')
const handleErrorAsync = require('../utils/handleErrorAsync')
const adminController = require('../controllers/admin')

router.get('/coaches/courses', auth, isCoach, handleErrorAsync(adminController.getCoachCourse))

router.get('/coaches/courses/:courseId', auth, isCoach, handleErrorAsync(adminController.getCoachCourseDetail))

router.get('/coaches/revenue', auth, isCoach, handleErrorAsync(adminController.getCoachRevenue))

router.get('/coaches', auth, isCoach, handleErrorAsync(adminController.getCoachDetail))

router.post('/coaches/courses', auth, isCoach, handleErrorAsync(adminController.postCoachCourse))

router.put('/coaches/courses/:courseId', auth, isCoach, handleErrorAsync(adminController.putCoachCourse))

router.post('/coaches/:userId', handleErrorAsync(adminController.postUserToCoach))

router.put('/coaches', auth, isCoach, handleErrorAsync(adminController.putCoachProfile))



module.exports = router