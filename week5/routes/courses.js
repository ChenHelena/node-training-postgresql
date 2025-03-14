const express = require('express')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Course')
const handleErrorAsync = require('../utils/handleErrorAsync')
const coursesController = require('../controllers/courses')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

// 取得課程列表
router.get('/', handleErrorAsync(coursesController.getCourses))

// 報名課程
router.post('/:courseId', auth, handleErrorAsync(coursesController.postCourse))

// 取消課程
router.delete('/:courseId', auth , handleErrorAsync(coursesController.deleteCourse))

module.exports = router