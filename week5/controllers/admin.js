const { dataSource } = require('../db/data-source')
const CoachLinkSkill = require('../entities/CoachLinkSkill')
const appError = require('../utils/appError')
const logger = require('../utils/logger')('adminController')
const { isUndefined, isNotValidString, isNotValidUUID, isNotValidInteger } = require('../utils/validUtils')
const { IsNull, In, Between } = require('typeorm')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)
const monthMap = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12
}

const adminController = {
    async getCoachCourse (req, res, next) {
        const { id } = req.user
        const courseRepo = dataSource.getRepository('Course')
        const courses = await courseRepo.find({
            select: {
                id: true,
                name: true,
                start_at: true,
                end_at: true,
                max_participants: true
            },
            where: {
                user_id: id
            }
        })
        
        const courseBookingRepo = dataSource.getRepository('CourseBooking')

        // 計算課程預定人數
        const courseIds = courses.map(course => course.id)
        const courseBookings = await courseBookingRepo.find({
            select: {
                course_id: true
            },
            where: {
                course_id: In(courseIds),
                cancelledAt: IsNull()
            },
        })

        const bookingCountMap = {}
        courseBookings.forEach((booking) => {
            if (!bookingCountMap[booking.course_id]) {
                bookingCountMap[booking.course_id] = 0;
            }
            bookingCountMap[booking.course_id]++;
        })
        

        res.status(200).json({
            status: 'success',
            data: courses.map((course) => {
                return {
                    id: course.id,
                    name : course.name,
                    start_at : course.start_at,
                    end_at : course.end_at,
                    max_participants : course.max_participants,
                    participants: bookingCountMap[course.id] || 0
                }
            })
        })
    },

    async getCoachDetail (req, res, next) {
        const { id } = req.user
        const coachRepo = dataSource.getRepository('Coach')
        const coach = await coachRepo.findOne({
            select: {
                id: true,
                experience_years: true,
                description: true,
                profile_image_url: true,
            },
            where: {
                user_id: id
            },
            relations: {
                CoachLinkSkill: true
            }
        })

        if (!coach) {
            return next(appError(404, '找不到教練'));
        }

        const skillIds = coach.CoachLinkSkill.map(skill => skill.skill_id)

        const result = {
            id: coach.id,
			experience_years: coach.experience_years,
			description: coach.description,
			profile_image_url: coach.profile_image_url,
			skill_ids: skillIds
        }
        
        res.status(200).json({
            status: 'success',
            data: result
        })
    },

    async getCoachCourseDetail (req, res, next) {
        const { id } = req.user
        const { courseId } = req.params
        console.log(id);
        
        const courseRepo = dataSource.getRepository('Course')
        const course = await courseRepo.findOne({
            select: {
                id: true,
                name: true,
                description: true,
                start_at: true,
                end_at: true,
                max_participants: true,
                meeting_url: true,
                Skill: {
                    name: true
                }
            },
            where: {
                id: courseId,
                user_id: id
            },
            relations: {
                Skill: true
            }
        })
        if(!course) {
            return next(appError(400, '課程不存在或無權限查看'))
        }
        
        res.status(200).json({
            status: 'success',
            data: {
                id: course.id,
                skill_name : course.Skill.name,
                name : course.name,
                description : course.description,
                start_at : course.start_at,
                end_at : course.end_at,
                max_participants : course.max_participants
            }
        })
    },

    async getCoachRevenue(req, res, next) {
        const { id } = req.user
        const { month } = req.query

        // 判斷 month 是否有效
        if(isUndefined(month) || !Object.prototype.hasOwnProperty.call(monthMap, month)){
            return next(appError(400, '欄位未填寫正確'))
        }

        const courseRepo = dataSource.getRepository('Course')
        const courses = await courseRepo.find({
            select: ['id'],
            user_id: id
        })

        const courseIds = courses.map(course => course.id)
        if (courseIds.length === 0) {
            res.status(200).json({
              status: 'success',
              data: {
                total: {
                  revenue: 0,
                  participants: 0,
                  course_count: 0
                }
              }
            })
            return
        }

        const year = new Date().getFullYear()
        const calculateStartAt = dayjs(`${year}-${month}-01`).startOf('month').toISOString()
        const calculateEndAt = dayjs(`${year}-${month}-01`).endOf('month').toISOString()
        const courseBookingRepo = dataSource.getRepository('CourseBooking')
        // 計算課程總預約數
        const courseCount = await courseBookingRepo.count({
            where: {
                course_id: In(courseIds),
                cancelledAt: IsNull(),
                createdAt: Between(calculateStartAt, calculateEndAt)
            }
        })

        // 計算不重複的學員
        const participantsCount = await courseBookingRepo.count({
            where: {
                course_id: In(courseIds),
                cancelledAt: IsNull(),
                createdAt: Between(calculateStartAt, calculateEndAt)
            },
            distinct: ['user_id']  // 這樣就會確保計算不同的 user_id
        });

        const creditPackageRepo = dataSource.getRepository('CreditPackage')
        const totalCreditAmount = await creditPackageRepo.sum('credit_amount')
        const totalPrice = await creditPackageRepo.sum('price')
        const perCreditPrice = totalPrice / totalCreditAmount
        const totalRevenue = courseCount * perCreditPrice

        res.status(200).json({
            status: 'success',
            data: {
                total: {
                    participants: participantsCount,
                    revenue: totalRevenue,
                    course_count: courseCount
                }
            }
        })
    },

    async postCoachCourse (req, res, next) {
        const { id } = req.user
        const { skill_id, name, description, start_at, end_at, max_participants, meeting_url } = req.body
        if(
            isNotValidString(skill_id) || 
            isNotValidString(name) || 
            isNotValidString(description) || 
            isNotValidString(start_at) || 
            isNotValidString(end_at)|| 
            isNotValidInteger(max_participants) || 
            isNotValidString(meeting_url) ||
            !/^https:\/\//.test(meeting_url)
        ) {
            return next(appError(400, '欄位未填寫正確'))
        }

        const courseRepo = dataSource.getRepository('Course')
        const newCourse = await courseRepo.create({
            user_id: id, 
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
    },

    async putCoachCourse (req, res, next) {
        const { id } = req.user
        const { courseId } = req.params
        const { skill_id, name, description, start_at, end_at, max_participants, meeting_url } = req.body
        if(
            isNotValidString(skill_id) || 
            isNotValidString(name) || 
            isNotValidString(description) || 
            isNotValidString(start_at) || 
            isNotValidString(end_at)|| 
            isNotValidInteger(max_participants) || 
            isNotValidString(meeting_url) ||
            !/^https:\/\//.test(meeting_url)
        ) {
            return next(appError(400, '欄位未填寫正確'))
        }

        const courseRepo = dataSource.getRepository('Course')
        const existCourse = await courseRepo.findOne({
            where: {
                id: courseId,
                user_id: id
            }
        })

        if (!existCourse) {
            return next(appError(400, '課程不存在'))
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
            return next(appError(400, '更新課程失敗'))
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
    },

    async postUserToCoach (req, res, next) {
        const { userId } = req.params
        const { experience_years, description, profile_image_url} = req.body
        if(isUndefined(experience_years) || isNotValidInteger(experience_years) || isUndefined(description) || isNotValidString(description)){
            return next(appError(400, '欄位未填寫正確'))
        }

        if(profile_image_url && (isNotValidString(profile_image_url) || !/^https:\/\//.test(profile_image_url))){
            return next(appError(400, '欄位未填寫正確'))
        }

        const userRepo = dataSource.getRepository('User');
        const coachRepo = dataSource.getRepository('Coach');

        await dataSource.transaction(async (transactionalEntityManager) => {
            // 檢查使用者是否存在
            const existUser = await transactionalEntityManager.findOne('User', { where: { id: userId } });
            if (!existUser) {
                return next(400, '使用者不存在');
            } else if (existUser.role === 'COACH') {
                return next(409, '使用者已經是教練');
            }

            // 更新角色
            const updateUser = await transactionalEntityManager.update('User', { id: userId }, { role: 'COACH' });
            if (updateUser.affected === 0) {
                return next(400, '更新使用者失敗');
            }

            // 使用者新增到教練資料表
            const newCoach = coachRepo.create({ user_id: userId, experience_years, description, profile_image_url });
            await transactionalEntityManager.save('Coach', newCoach);
        });

        // 返回成功訊息
        const userResult = await userRepo.findOne({ where: { id: userId } });
        const coachResult = await coachRepo.findOne({ where: { user_id: userId } });
        res.status(201).json({
            status: "success",
            data: {
                user: { name: userResult.name, role: userResult.role },
                coach: coachResult
            }
        });
    },

    async putCoachProfile (req, res, next) {
        const { id } = req.user
        const { 
            experience_years: experienceYears,
            description,
			profile_image_url: profileImageUrl = null,
			skill_ids: skillIds
        } = req.body

        if(isUndefined(experienceYears) || isNotValidInteger(experienceYears) ||
           isUndefined(description) || isNotValidString(description) ||
           isUndefined(profileImageUrl) || isNotValidString(profileImageUrl) ||
           !profileImageUrl.startsWith('https') ||
           isUndefined(skillIds) || !Array.isArray(skillIds) || skillIds.length === 0){
            return next(appError(400, '欄位未填寫正確'))
        }

        const coachRepo = dataSource.getRepository('Coach')
        const coach = await coachRepo.findOne({
            select: ['id', 'experience_years', 'description', 'profile_image_url'], 
            where: {
                user_id: id
            }
        })

        await coachRepo.update({
            id: coach.id
        }, {
            experience_years: experienceYears,
            description,
			profile_image_url: profileImageUrl,
        })

        const coachLinkSkillRepo = dataSource.getRepository('CoachLinkSkill')
        const newCoachLinkSkill = skillIds.map((skill) => ({
            coach_id: coach.id,
            skill_id: skill
        }))

        await coachLinkSkillRepo.delete({coach_id: coach.id})
        await coachLinkSkillRepo.insert(newCoachLinkSkill)

        const updateSkills = await coachLinkSkillRepo.find({
            select: ['skill_id'],
            where: {
                coach_id: coach.id
            }
        })

        const updateSkillsId = updateSkills.map((skill) => {
            return skill.skill_id
        })

        const result = {
            experience_years : coach.experience_years,
            description : coach.description,
            profile_image_url : coach.profile_image_url,
            skill_ids: updateSkillsId
        }


        res.status(200).json({
            status : "success",
            data: result
        })
    }
}

module.exports = adminController