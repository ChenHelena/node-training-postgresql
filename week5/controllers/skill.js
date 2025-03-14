const { dataSource } = require('../db/data-source')
const appError = require('../utils/appError')
const logger = require('../utils/logger')('SkillController')
const { isUndefined, isNotValidString, isNotValidUUID } = require('../utils/validUtils')


const skillController = {
    async getSkills (req, res, next) {
        const skills = await dataSource.getRepository("Skill").find({
            select: ["id", "name"]
        })
        res.status(200).json({
            status: 'success',
            data: skills
        })
    },

    async postSkill (req, res, next) {
        const { name } = req.body
        if(isUndefined(name) || isNotValidString(name)){
            return next(appError(400, '欄位未填寫正確'))
        }

        const skillRepo = await dataSource.getRepository("Skill")
        const existSkill = await skillRepo.find({
            where: {
                name
            }
        })

        // 檢查資料是否重複
        if(existSkill.length > 0){
            return next(appError(409, '資料重複'))
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
    },

    async deleteSkill (req, res, next) {
        const { skillId } = req.params
        if(isUndefined(skillId) || isNotValidString(skillId) || isNotValidUUID(skillId)){
            return next(appError(400, 'ID錯誤'))
        }
        
        // 刪除技能
        const result = await dataSource.getRepository("Skill").delete(skillId)
        if (result.affected === 0) {
            return next(appError(400, 'ID錯誤'))
        }
        res.status(200).json({
            status: 'success',
            data: result
        })
    },

    async deleteSkills (req, res, next) {
        const result = dataSource.getRepository("Skill").delete({})
        if (result.affected === 0) {
            return next(appError(400, 'ID錯誤'))
        }
        res.status(200).json({
            status: 'success',
            message: '已刪除所有資料'
        })
    }
}

module.exports = skillController