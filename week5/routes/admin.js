const express = require('express')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Admin')
const { isUndefined, isNotValidString, isNotValidUUID, isNotValidInteger, isValidPassword } = require('../utils/validUtils')

router.post('/coaches/courses', async (req, res, next) => {
    try {
        
        const { user_id, skill_id, name, description, start_at, end_at, max_participants, meeting_url } = req.body
        if(
            isNotValidString(user_id) || 
            isNotValidString(skill_id) || 
            isNotValidString(name) || 
            isNotValidString(description) || 
            isNotValidString(start_at) || 
            isNotValidString(end_at)|| 
            isNotValidInteger(max_participants) || 
            isNotValidString(meeting_url) ||
            !/^https:\/\//.test(meeting_url)
        ) {
            res.status(400).json({
                status : "failed",
                message: "欄位未填寫正確"
            })
            return
        }

        const userRepo = await dataSource.getRepository('User')
        const existUser = await userRepo.findOne({
            where: {
                id: user_id
            }
        })

        if (!existUser) {
            res.status(400).json({
                status : "failed",
                message: "使用者不存在"
            })
            return
        } else if (existUser.role !== 'COACH' ) {
            res.status(400).json({
                status : "failed",
                message: "使用者尚未成為教練"
            })
            return
        }

        const courseRepo = await dataSource.getRepository('Course')
        const newCourse = await courseRepo.create({
            user_id, 
            skill_id, 
            name, 
            description, 
            start_at, 
            end_at, 
            max_participants, 
            meeting_url
        })

        const result = await courseRepo.save(newCourse)

        res.status(201).json({
            status: 'success',
            data: {
                course: result
            }
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.put('/coaches/courses/:courseId', async (req, res, next) => {
    try {
        const { courseId } = req.params
        const { user_id, skill_id, name, description, start_at, end_at, max_participants, meeting_url } = req.body
        if(
            isNotValidString(user_id) || 
            isNotValidString(skill_id) || 
            isNotValidString(name) || 
            isNotValidString(description) || 
            isNotValidString(start_at) || 
            isNotValidString(end_at)|| 
            isNotValidInteger(max_participants) || 
            isNotValidString(meeting_url) ||
            !/^https:\/\//.test(meeting_url)
        ) {
            res.status(400).json({
                status : "failed",
                message: "欄位未填寫正確"
            })
            return
        }

        const courseRepo = await dataSource.getRepository('Course')
        const existCourse = await courseRepo.findOne({
            where: {
                id: courseId
            }
        })

        if (!existCourse) {
            res.status(400).json({
                status : "failed",
                message: "課程不存在"
            })
            return
        }

        // 更新
        const updateCourse = await courseRepo.update({
                id: courseId
            },{
                skill_id, 
                name, 
                description, 
                start_at, 
                end_at, 
                max_participants, 
                meeting_url
            }
        )

        if (updateCourse.affected === 0) {
            res.status(400).json({
                status : "failed",
                message: "更新課程失敗"
            })
            return
        }

        const saveCourse = await courseRepo.findOne({
            where: {
                id: courseId
            }
        })

        res.status(201).json({
            status : "success",
            data: {
                course: saveCourse
            }
        })

    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.post('/coaches/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params
        const { experience_years, description, profile_image_url} = req.body
        if(isUndefined(experience_years) || isNotValidInteger(experience_years) || isUndefined(description) || isNotValidString(description)){
            res.status(400).json({
                status : "failed",
                message: "欄位未填寫正確"
            })
            return
        }

        if(profile_image_url && (isNotValidString(profile_image_url) || !/^https:\/\//.test(profile_image_url))){
            res.status(400).json({
                status : "failed",
                message: "欄位未填寫正確"
            })
            return
        }

        // 重複資料
        const userRepo = await dataSource.getRepository('User')
        const existUser = await userRepo.findOne({
            where: {
                id: userId
            }
        })

        if (!existUser) {
            res.status(400).json({
                status : "failed",
                message: "使用者不存在"
            })
            return
        } else if (existUser.role === 'COACH') {
            res.status(409).json({
                status : "failed",
	            message: "使用者已經是教練"
            })
            return
        }

        // 更新角色
        const updateUser = await userRepo.update({
                id: userId
            }, {
                role: 'COACH'
            }
        )

        if (updateUser.affected === 0) {
            res.status(400).json({
                status : "failed",
                message: "更新使用者失敗"
            })
            return
        }

        // 使用者新增到教練資料表
        const coachRepo = await dataSource.getRepository('Coach')
        const newCoach = await coachRepo.create({
            user_id: userId,
            experience_years, 
            description, 
            profile_image_url
        })

        const coachResult = await coachRepo.save(newCoach)
        const userResult = await userRepo.findOne({
            where: {
                id: userId
            }
        })
        res.status(201).json({
            status : "success",
            data: {
                user: {
                    name: userResult.name,
                    role: userResult.role
                },
                coach: coachResult
            }
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})



module.exports = router