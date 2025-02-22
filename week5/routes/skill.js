const express = require('express')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Skill')
const { isUndefined, isNotValidString, isNotValidUUID } = require('../utils/validUtils')

router.get('/', async (req, res, next) => {
    try {
        const skills = await dataSource.getRepository("Skill").find({
            select: ["id", "name"]
        })
        res.status(200).json({
            status: 'success',
            data: skills
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.post('/', async (req, res, next) => {
    try {
        const { name } = req.body
        if(isUndefined(name) || isNotValidString(name)){
            res.status(400).json({
                status: 'failed',
                meaasge: "欄位未填寫正確"
            })
            return
        }

        const skillRepo = await dataSource.getRepository("Skill")
        const existSkill = await skillRepo.find({
            where: {
                name
            }
        })

        // 檢查資料是否重複
        if(existSkill.length > 0){
            res.status(409).json({
                status: 'failed',
                meaasge: "資料重複"
            })
            return
        }

        // 新增技能
        const newSkill = skillRepo.create({
            name
        })

        const result = await skillRepo.save(newSkill)
        res.status(200).json({
            status: 'success',
            data: result
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.delete('/:skillId', async (req, res, next) => {
    try {
        const { skillId } = req.params
        if(isUndefined(skillId) || isNotValidString(skillId) || isNotValidUUID(skillId)){
            res.status(400).json({
                status: 'failed',
                message: "ID錯誤"
            })
            return
        }
        
        // 刪除技能
        const result = await dataSource.getRepository("Skill").delete(skillId)
        if (result.affected === 0) {
            res.status(400).json({
                status: 'failed',
                message: "ID錯誤"
            })
            return
        }
        res.status(200).json({
            status: 'success',
            data: result
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.delete('/', async (req, res, next) => {
    try {
        const result = dataSource.getRepository("Skill").delete({})
        if (result.affected === 0) {
            res.status(400).json({
                status: 'failed',
                message: "ID錯誤"
            })
            return
        }
        res.status(200).json({
            status: 'success',
            message: '已刪除所有資料'
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
    
})
module.exports = router