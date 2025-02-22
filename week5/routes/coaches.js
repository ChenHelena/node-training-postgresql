const express = require('express')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Coach')
const { isUndefined, isNotValidString, isNotValidUUID, isNotValidInteger, isValidPassword } = require('../utils/validUtils')

router.get('/', async (req, res, next) => {
    try {
        const per = Number(req.query.per)
        const page = Number(req.query.page)
        // 數據庫查詢位置
        const skip = ( page - 1 ) * per
        if (isNotValidInteger(per) || isNotValidInteger(page) || per <= 0 || page <= 0) {
            res.status(400).json({
                status : "failed",
                message: "欄位格式錯誤"
            })
            return
        }

        const coachRepo = await dataSource.getRepository('Coach')
        const [ coaches, total ] = await coachRepo.findAndCount({
            skip,
            // 限制返回的頁數
            take: per
        })

        const totalPages = Math.ceil( total / per )

        if (page > totalPages) {
            res.status(400).json({
                status: "failed",
                message: `請求頁數超過總頁數（最大頁數：${totalPages}）`
            })
        }

        res.status(200).json({
            status : "success",
            per,           
            page, 
            total,  
            totalPages,
            data: coaches 
        })


    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.get('/:coachId', async (req, res, next) => {
    try {
        const { coachId } = req.params
        if (isUndefined(coachId) || isNotValidString(coachId) || typeof coachId !== 'string') {
            res.status(400).json({
                status : "failed",
                message: "欄位格式錯誤"
            })
            return
        }
        const coachRepo = await dataSource.getRepository('Coach')
        const coach = await coachRepo.findOne({
            where: {
                id: coachId
            }
        })

        if (!coach) {
            res.status(400).json({
                status : "failed",
                message: "找不到該教練"
            })
            return
        }

        const userRepo = await dataSource.getRepository('User')
        const userResult = await userRepo.findOne({
            where: {
                id: coach.user_id
            }
        })

        res.status(200).json({
            status: "success",
            coach,
            user: userResult
        })

    } catch (error) {
        logger.error(error)
        next(error)
    }
})


module.exports = router