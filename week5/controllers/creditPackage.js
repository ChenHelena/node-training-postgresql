const { dataSource } = require('../db/data-source')
const appError = require('../utils/appError')
const logger = require('../utils/logger')('creditPackageController')
const { isUndefined, isNotValidString, isNotValidUUID, isNotValidInteger } = require('../utils/validUtils')

const creditPackageController = {
    async getCreditPackages (req, res, next) {
        const packages = await dataSource.getRepository("CreditPackage").find({
            select: ["id", "name", "credit_amount", "price"]
        })
        res.status(200).json({
            status: "success",
            data: packages
        })
    },

    async postCreditPackage (req, res, next) {
        const { name, credit_amount: creditAmount, price } = req.body
        if (isUndefined(name) || isNotValidString(name) ||
                isUndefined(creditAmount) || isNotValidInteger(creditAmount) ||
                isUndefined(price) || isNotValidInteger(price)) {
            return next(appError(400, '欄位未填寫正確'))
        }

        const creditPackageRepo = dataSource.getRepository("CreditPackage")
        const existPackage = await creditPackageRepo.find({
            where: {
            name
            }
        })
        if (existPackage.length > 0) {
            return next(appError(409, '資料重複'))
        }
        const newPackage = await creditPackageRepo.create({
            name,
            credit_amount: creditAmount,
            price
        })
        const result = await creditPackageRepo.save(newPackage)
        res.status(200).json({
            status: 'success',
            data: result
        })
    },

    async postCreditPurchase (req, res, next) {
        const { id } = req.user
        const { creditPackageId } = req.params

        const creditPackageRepo = dataSource.getRepository('CreditPackage')
        const creditPackage = await creditPackageRepo.findOne({
            where: {
                id: creditPackageId
            }
        })

        if(!creditPackage) {
            return next(appError(400, 'ID錯誤'))
        }

        const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
        const newPurchase = await creditPurchaseRepo.create({
            user_id: id,
            credit_package_id: creditPackageId,
            purchased_credits: creditPackage.credit_amount,
            price_paid: creditPackage.price,
            purchaseAt: new Date().toISOString()
        })

        const result = await creditPurchaseRepo.save(newPurchase)

        res.status(201).json({
            status: 'success',
            data: result
        })
    },

    async deleteCreditPurchase (req, res, next) {
        const { creditPackageId } = req.params
        if (isUndefined(creditPackageId) || isNotValidString(creditPackageId)) {
            return next(appError(400, '欄位未填寫正確'))
        }
        const result = await dataSource.getRepository('CreditPurchase').delete(creditPackageId)
        
        if (result.affected === 0) {
            return next(appError(400, 'ID錯誤'))
        }
        res.status(200).json({
            status: "success",
            data: result
        })
    }
}

module.exports = creditPackageController