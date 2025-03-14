const express = require('express')

const router = express.Router()
const handleErrorAsync = require('../utils/handleErrorAsync')
const coachesController = require('../controllers/coaches')

router.get('/', handleErrorAsync(coachesController.getCoaches))

router.get('/:coachId', handleErrorAsync(coachesController.getCoach))

router.get('/:coachId/courses', handleErrorAsync(coachesController.getCoachCourses))


module.exports = router