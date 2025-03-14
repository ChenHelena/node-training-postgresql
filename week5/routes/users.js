const express = require('express')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('User')
const handleErrorAsync = require('../utils/handleErrorAsync')
const userController = require('../controllers/users')
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
})

router.post('/signup', handleErrorAsync(userController.signup))

router.post('/login', handleErrorAsync(userController.login))

router.get('/profile', auth, handleErrorAsync(userController.getProfile))

router.put('/profile', auth, handleErrorAsync(userController.putProfile))

router.put('/password', auth, handleErrorAsync(userController.putPassword))

router.get('/credit-package', auth, handleErrorAsync(userController.getUserPackages))

router.get('/courses', auth, handleErrorAsync(userController.getUserCourses))

module.exports = router