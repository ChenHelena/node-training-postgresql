const express = require('express')

const router = express.Router()
const handleErrorAsync = require('../utils/handleErrorAsync')
const skillController = require('../controllers/skill')

router.get('/', handleErrorAsync(skillController.getSkills))

router.post('/', handleErrorAsync(skillController.postSkill))

router.delete('/:skillId', handleErrorAsync(skillController.deleteSkill))

router.delete('/', handleErrorAsync(skillController.deleteSkills))

module.exports = router