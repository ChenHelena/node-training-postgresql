const express = require('express')
const { IsNull } = require('typeorm')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Course')
const { isUndefined, isNotValidString, isNotValidUUID, isNotValidInteger, isValidPassword } = require('../utils/validUtils')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

// 取得課程列表
router.get('/', async (req, res, next) => {
    try {
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

    } catch (error) {
        logger.error(error)
        next(error)
    }
})

// 報名課程
router.post('/:courseId', auth, async (req, res, next) => {
    try {
        const { id } = req.user
        const { courseId } = req.params
        if (isUndefined(courseId) || isNotValidString(courseId)) {
            res.status(400).json({
                status: 'failed',
                data: '欄位未填寫正確'
            })
            return
        }
        const courseRepo = dataSource.getRepository('Course')
        const course = await courseRepo.findOne({
            where: {
                id: courseId
            }
        })

        if (!course) {
            res.status(400).json({
                status: 'failed',
                data: 'ID錯誤'
            })
            return
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
            res.status(400).json({
                status: 'failed',
                data: '已經報名過此課程'
            })
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
            res.status(400).json({
                status: 'failed',
                data: '已無可使用堂數'
            })
            return
        } else if (courseBookingCount >= course.max_participants) {
            res.status(400).json({
                status: 'failed',
                data: '已達最大參加人數，無法參加'
            })
            return
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
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

// 取消課程
router.delete('/:courseId', auth , async(req, res, next) => {
    try {
        const { id } = req.user
        const { courseId } = req.params
        if (isUndefined(courseId) || isNotValidString(courseId)) {
            res.status(400).json({
                status: 'failed',
                data: '欄位未填寫正確'
            })
            return
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
            res.status(400).json({
                status: 'failed',
                data: 'ID錯誤'
            })
            return
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
            res.status(400).json({
            status: 'failed',
            message: '取消失敗'
            })
            return
        }

        res.status(200).json({
            status: 'success',
            data: updateResult
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

module.exports = router