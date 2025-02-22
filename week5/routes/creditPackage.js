const express = require('express')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackage')
const { isUndefined, isNotValidString, isNotValidInteger } = require('../utils/validUtils')

router.get('/', async (req, res, next) => {
    try{
        const packages = await dataSource.getRepository("CreditPackage").find({
            select: ["id", "name", "credit_amount", "price"]
        })
        res.status(200).json({
            status: "success",
            data: packages
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.post('/', async (req, res, next) => {
    try{
        const { name, credit_amount: creditAmount, price } = req.body
        if (isUndefined(name) || isNotValidString(name) ||
                isUndefined(creditAmount) || isNotValidInteger(creditAmount) ||
                isUndefined(price) || isNotValidInteger(price)) {
          res.status(400).json({
            status: 'failed',
            message: '欄位未填寫正確'
          })
          return
        }

        const creditPackageRepo = await dataSource.getRepository("CreditPackage")
        const existPackage = await creditPackageRepo.find({
          where: {
            name
          }
        })
        if (existPackage.length > 0) {
          res.status(409).json({
            status: 'failed',
            message: '資料重複'
          })
          return
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
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.delete('/:creditPackageId', async (req, res, next) => {
    try{
        const { creditPackageId } = req.params
        if (isUndefined(creditPackageId) || isNotValidString(creditPackageId)) {
            res.status(400).json({
                status: "failed",
                message: "欄位未填寫正確"
            })
            return
        }
        const result = await dataSource.getRepository("CreditPackage").delete(creditPackageId)
        if (result.affected === 0) {
            res.status(400).json({
                status: "failed",
                message: "ID錯誤"
            })
            return
        }
        res.status(200).json({
            status: "success"
        })  
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.delete('/', async (req, res, next) => {
    const result = await dataSource.getRepository("CreditPackage").delete({})
    if(result.affected === 0){
        res.status(400).json({
            status: "failed",
            message: "無資料刪除"
        })
        return
    }
    res.status(200).json({
        status: "success",
        message: "已刪除所有資料"
    })
})
module.exports = router
