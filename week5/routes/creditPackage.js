const express = require('express')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackage')
const { isUndefined, isNotValidString, isNotValidInteger } = require('../utils/validUtils')
const handleErrorAsync = require('../utils/handleErrorAsync')
const creditPackageController = require('../controllers/creditPackage')
const CreditPurchase = require('../entities/CreditPurchase')
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
})

router.get('/', handleErrorAsync(creditPackageController.getCreditPackages))

router.post('/', handleErrorAsync(creditPackageController.postCreditPackage))

router.post('/:creditPackageId', auth, handleErrorAsync(creditPackageController.postCreditPurchase))

router.delete('/:creditPackageId', handleErrorAsync(creditPackageController.deleteCreditPurchase))

module.exports = router
