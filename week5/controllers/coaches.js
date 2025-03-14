const { dataSource } = require('../db/data-source')
const appError = require('../utils/appError')
const logger = require('../utils/logger')('coachesController')
const { isUndefined, isNotValidString, isNotValidUUID, isNotValidInteger } = require('../utils/validUtils')


const coachesController = {
    async getCoaches (req, res, next) {
        const per = Number(req.query.per)
        const page = Number(req.query.page)
        // 數據庫查詢位置
        const skip = ( page - 1 ) * per
        if (isNotValidInteger(per) || isNotValidInteger(page) || per <= 0 || page <= 0) {
            return next(appError(400, '欄位格式錯誤'))
        }

        const coachRepo = await dataSource.getRepository('Coach')
        const [ coaches, total ] = await coachRepo.findAndCount({
            skip,
            // 限制返回的頁數
            take: per
        })

        const totalPages = Math.ceil( total / per )

        if (page > totalPages) {
            return next(appError(400, '請求頁數超過總頁數（最大頁數：${totalPages}）'))
        }

        res.status(200).json({
            status : "success",
            per,           
            page, 
            total,  
            totalPages,
            data: coaches 
        })
    },

    async getCoach (req, res, next) {
        const { coachId } = req.params
        if (isUndefined(coachId) || isNotValidString(coachId)) {
            return next(appError(400, '欄位格式錯誤'))
        }
        const coachRepo = await dataSource.getRepository('Coach')
        const coach = await coachRepo.findOne({
            where: {
                id: coachId
            }
        })

        if (!coach) {
            return next(appError(400, '找不到該教練'))
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
    },

    async getCoachCourses (req, res, next) {
        const { coachId } = req.params
        if(isUndefined(coachId) || isNotValidString(coachId)){
            return next(appError(400, '欄位未填寫正確'))
        }

        const coachRepo = dataSource.getRepository('Coach')
        const coach = await coachRepo.findOne({
            select: {
                id: true,
                user_id: true,
            },
            where: {
                id: coachId
            },
        })

        if (!coach) {
            return next(appError(400, '找不到該教練'))
        }
        
        const courseRepo = dataSource.getRepository('Course')
        const courses = await courseRepo.find({
            select: {
                id: true,
                user_id: true,
                name: true,
                description: true,
                start_at: true,
                end_at: true,
                max_participants: true,
                Skill: {
                    name: true
                },
                User: {
                    name: true
                }
            },
            where: {
                user_id: coach.user_id
            },
            relations: {
                Skill :true,
                User: true
            }
        })
        
        res.status(200).json({
            status: "success",
            data: courses.map((course) => {
                return {
                    id: course.id,
                    coach_name : course.User.name,
                    skill_name : course.Skill.name,
                    name : course.name,
                    description : course.description,
                    start_at : course.start_at,
                    end_at : course.end_at,
                    max_participants : course.max_participants
                }
            })
        })
    }
}

module.exports = coachesController