const { dataSource } = require('../db/data-source')
const appError = require('../utils/appError')
const logger = require('../utils/logger')('userController')
const { isUndefined, isNotValidString, isNotValidUUID, isValidPassword } = require('../utils/validUtils')
const bcrypt = require('bcrypt')
const generateJWT = require('../utils/generateJWT')
const config = require('../config/index')
const { IsNull, In } = require('typeorm')

const userController = {
    async signup (req, res, next) {
        const { name, email, password } = req.body
        if(isUndefined(name) || isNotValidString(name) || isUndefined(email) || isNotValidString(email) || isUndefined(password) || isNotValidString(password)){
            return next(appError(400, '欄位未填寫正確'))
        }
        
        if(!isValidPassword(password)) {
            return next(appError(400, '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'))
        }

        const userRepo = await dataSource.getRepository('User')
        const existUser = await userRepo.findOne({
            where: {
                email
            }
        })

        if (existUser) {
            return next(appError(409, 'Email已被使用'))
        }
        // 加密密碼
        const saltRounds = process.env.SALT_ROUNDS || 10;
        const salt = await bcrypt.genSalt(Number(saltRounds))
        const hashPassword = await bcrypt.hash(password, salt)
        const newUser = await userRepo.create({
            name,
            email,
            password: hashPassword,
            role: 'USER'
        })

        const result = await userRepo.save(newUser)

        res.status(201).json({
            status : "success",
            data: {
                user: {
                    id: result.id,
                    name: result.name
                }
            }
        })
    },

    async login (req, res, next) {
        const { email, password } = req.body
        if (isUndefined(email) || isUndefined(password) || isNotValidString(email) || isNotValidString(password)) {
            return next(appError(400, '欄位未填寫正確'))
        }

        if (!isValidPassword(password)) {
            return next(appError(400, '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'))
        }

        const userRepo = dataSource.getRepository('User')
        const existUser = await userRepo.findOne({
            select: ['id', 'name', 'password'],
            where: {
                email
            }
        })
        
        if (!existUser) {
            return next(appError(400, '使用者不存在或密碼輸入錯誤'))
        }

        // 檢查密碼
        const isMatch = await bcrypt.compare(password, existUser.password)
        if (!isMatch) {
            return next(appError(400, '使用者不存在或密碼輸入錯誤'))
        }

        const token = await generateJWT({
            id: existUser.id
        }, config.get('secret.jwtSecret'), {
            expiresIn: `${config.get('secret.jwtExpiresDay')}`
        })

        res.status(200).json({
            status : 'success',
            data: {
                token: token,
                user: {
                    name: existUser.name
                }
            }
        })
    },

    async getProfile (req, res, next) {
        const { id } = req.user
        const userRepo = dataSource.getRepository('User')
        const user = await userRepo.findOne({
            where: {
                id
            }
        })
        res.status(200).json({
            status : 'success',
            data: user
        })
    },

    async putProfile (req, res, next) {
        const { id } = req.user
        const { name } = req.body
        if (isUndefined(name) || isNotValidString(name)){
            return next(appError(400, '欄位未填寫正確'))
        }

        const userRepo = dataSource.getRepository('User')
        const user = await userRepo.findOne({
            where: {
                id
            }
        })

        if (user.name === name){
            return next(appError(400, '更新使用者失敗'))
        }

        const updateResult = await userRepo.update({
            id
        }, {
            name
        })

        if (updateResult.affected === 0) {
            return next(appError(400, '更新使用者失敗'))
        }

        const result = await userRepo.findOne({
            where: {
                id
            }
        })
        res.status(200).json({
            status : 'success',
            data: result
        })
    },

    async putPassword(req, res, next) {
        const { id } = req.user
        const { password, new_password, confirm_new_password } = req.body
        if(isUndefined(password) || isNotValidString(password) || 
           isUndefined(new_password) || isNotValidString(password) || 
           isUndefined(confirm_new_password) || isNotValidString(confirm_new_password)){
            return next(appError(400, '欄位未填寫正確'))
        }

        const userRepo = dataSource.getRepository('User')
        const findUser = await userRepo.findOne({
            select: ['password'],
            where: {
                id,
            }
        })

        const isMatch = await bcrypt.compare(password, findUser.password)

        if(!isMatch) {
            return next(appError(400, '密碼輸入錯誤'))
        }

        if(new_password === findUser.password) {
            return next(appError(400, '新密碼不能與舊密碼相同'))
        }

        if(new_password !== confirm_new_password) {
            return next(appError(400, '新密碼與驗證新密碼不一致'))
        }

        if(!isValidPassword(new_password) || !isValidPassword(confirm_new_password)){
            return next(appError(400, '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'))
        }

        res.status(200).json({
            status : 'success',
        })
    },

    async getUserPackages (req, res, next) {
        const { id } = req.user

        const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
        const creditPurchase = await creditPurchaseRepo.find({
            select: {
                purchased_credits: true,
                price_paid: true,
                purchaseAt: true,
                CreditPackage: {
                    name: true
                }
            },
            where: {
                user_id: id
            },
            relations: {
                CreditPackage: true
            }
        })


        res.status(200).json({
            status : 'success',
            data: creditPurchase.map((item) => {
                return {
                    purchased_credits: item.purchased_credits,
                    price_paid: parseInt(item.price_paid, 10),
                    name: item.CreditPackage.name,
                    purchaseAt: item.purchaseAt,
                }
            })
        })
    },

    async getUserCourses (req, res, next) {
        const { id } = req.user
        const courseBookingRepo = dataSource.getRepository('CourseBooking')
        const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
        const userCredit = await creditPurchaseRepo.sum('purchased_credits',{
            user_id: id
        })
        const userUsedCredit = await courseBookingRepo.count({
            where: {
                user_id: id,
                cancelledAt: IsNull()
            }
        })
        
        const courseBookings = await courseBookingRepo.find({
            select: {
                course_id: true,
                Course: {
                    name: true,
                    start_at: true,
                    end_at: true,
                    meeting_url: true,
                    user_id: true
                }
            },
            where: {
                user_id: id
            },
            relations: {
                Course: true
            },
        })

        const coachUserName = {}
        if(courseBookings.length > 0){
            // 取得教練 ID
            courseBookings.forEach((courseBooking) => {
                coachUserName[courseBooking.Course.user_id] = courseBooking.Course.user_id
            })

            const userRepo = dataSource.getRepository('User')
            const coachUsers = await userRepo.find({
                select: ['id', 'name'],
                where: {
                    id: In(Object.values(coachUserName))
                }
            })

            coachUsers.forEach((user) => {
                coachUserName[user.id] = user.name
            })
        }

        res.status(200).json({
            status : 'success',
            data: {
                credit_remain: userCredit - userUsedCredit,
                credit_usage: userUsedCredit,
                course_booking: courseBookings.map((courseBooking) => {
                    return {
                        name: courseBooking.Course.name,
                        course_id: courseBooking.course_id,
                        coach_name: coachUserName[courseBooking.Course.user_id],
                        start_at: courseBooking.Course.start_at,
                        end_at: courseBooking.Course.end_at,
                        meeting_url: courseBooking.Course.meeting_url
                    }
                })
            },
        })
    }
}

module.exports = userController