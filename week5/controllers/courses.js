const { dataSource } = require('../db/data-source')
const appError = require('../utils/appError')
const logger = require('../utils/logger')('coursesController')
const { isUndefined, isNotValidString, isNotValidUUID, isNotValidInteger } = require('../utils/validUtils')
const { IsNull } = require('typeorm')

const coursesController = {
    async getCourses (req, res, next) {
        const courses = await dataSource.getRepository('Course').find({
            select: {
                id: true,
                name: true,
                description: true,
                start_at: true,
                end_at: true,
                max_participants: true,
                User: {
                    name: true
                },
                Skill: {
                    name: true
                }
            },
            relations: {
                User: true,
                Skill: true
            }
        })
        const result = courses.map((course) => {
            return {
                id: course.id,
                coach_name: course.User.name,
                skill_name: course.Skill.name,
                name: course.name,
                description: course.description,
                start_at: course.start_at,
                end_at: course.end_at,
                max_participants: course.max_participants
            }
        })
        
        res.status(200).json({
            status: 'success',
            data: result
        })
    },

    async postCourse (req, res, next) {
        const { id } = req.user
        const { courseId } = req.params
        if (isUndefined(courseId) || isNotValidString(courseId)) {
            return next(appError(400, '欄位未填寫正確'))
        }
        const courseRepo = dataSource.getRepository('Course')
        const course = await courseRepo.findOne({
            where: {
                id: courseId
            }
        })

        if (!course) {
            return next(appError(400, 'ID錯誤'))
        }

        const courseBookingRepo = dataSource.getRepository('CourseBooking')
        const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
        const existCourseRepo = await courseBookingRepo.findOne({
            where: {
                user_id: id,
                course_id: courseId
            }
        })

        if(existCourseRepo) {
            return next(appError(400, '已經報名過此課程'))
        }

        // 使用者購買的堂數
        const userCredit = await creditPurchaseRepo.sum('purchased_credits', {
            user_id: id
        })

        // 剩餘課程
        const userUserdCredit = await courseBookingRepo.count({
            where: {
                user_id: id,
                cancelledAt: IsNull()
            }
        })

        // 課程報名人數
        const courseBookingCount = await courseBookingRepo.count({
            where: {
                course_id: courseId,
                cancelledAt: IsNull()
            }
        })

        if (userUserdCredit >= userCredit) {
            return next(appError(400, '已無可使用堂數'))
        } else if (courseBookingCount >= course.max_participants) {
            return next(appError(400, '已達最大參加人數，無法參加'))
        }

        const newCourseBooking = await courseBookingRepo.create({
            user_id: id,
            course_id: courseId
        })

        const result = await courseBookingRepo.save(newCourseBooking)

        res.status(200).json({
            status: 'success',
            data: result
        })
    },

    async deleteCourse (req, res, next) {
        const { id } = req.user
        const { courseId } = req.params
        if (isUndefined(courseId) || isNotValidString(courseId)) {
            return next(appError(400, '欄位未填寫正確'))
        }

        const courseBookingRepo = dataSource.getRepository('CourseBooking')
        const userCourseBooking = await courseBookingRepo.findOne({
            where:{
                user_id: id,
                course_id: courseId,
                cancelledAt: IsNull()
            }
        })

        if (!userCourseBooking) {
            return next(appError(400, 'ID錯誤'))
        }

        const updateResult = await courseBookingRepo.update(
            {
                user_id: id,
                course_id: courseId,
                cancelledAt: IsNull()
            },
            {
                cancelledAt: new Date().toISOString()
            }
        )

        if (updateResult.affected === 0) {
            return next(appError(400, '取消失敗'))
        }

        res.status(200).json({
            status: 'success',
            data: updateResult
        })
    }
}

module.exports = coursesController