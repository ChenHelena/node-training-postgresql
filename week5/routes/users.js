const express = require('express')
const bcrypt = require('bcrypt')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('User')
const { isUndefined, isNotValidString, isNotValidUUID, isNotValidInteger, isValidPassword } = require('../utils/validUtils')
const generateJWT = require('../utils/generateJWT')
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
})

router.post('/signup', async (req, res, next) => {
    try {
        const { name, email, password } = req.body
        if(isUndefined(name) || isNotValidString(name) || isUndefined(email) || isNotValidString(email) || isUndefined(password) || isNotValidString(password)){
            res.status(400).json({
                status : "failed",
                message: "欄位未填寫正確"
            })
            return
        }
        
        if(!isValidPassword(password)) {
            res.status(400).json({
                status : "failed",
                message: "密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字"
            })
            return
        }

        const userRepo = await dataSource.getRepository('User')
        const existUser = await userRepo.findOne({
            where: {
                email
            }
        })

        if (existUser) {
            res.status(409).json({
                status : "failed",
	            message: "Email已被使用"
            })
            return
        }
        // 加密密碼
        const salt = await bcrypt.genSalt(10)
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
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body
        if (isUndefined(email) || isUndefined(password) || isNotValidString(email) || isNotValidString(password)) {
            res.status(400).json({
                status: 'failed',
                data: '欄位未填寫正確'
            })
            return
        }

        if (!isValidPassword(password)) {
            res.status(400).json({
                status: 'failed',
                data: '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
            })
            return
        }

        const userRepo = dataSource.getRepository('User')
        const existUser = await userRepo.findOne({
            select: ['id', 'name', 'password'],
            where: {
                email
            }
        })
        
        if (!existUser) {
            res.status(400).json({
                status: 'failed',
                data: '使用者不存在或密碼輸入錯誤'
            })
            return
        }

        // 檢查密碼
        const isMatch = await bcrypt.compare(password, existUser.password)
        if (!isMatch) {
            res.status(400).json({
                status: 'failed',
                data: '使用者不存在或密碼輸入錯誤'
            })
            return
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
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.get('/profile', auth, async (req, res, next) => {
    try {
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
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.put('/profile', auth, async (req, res, next) => {
    try {
        const { id } = req.user
        const { name } = req.body
        if (isUndefined(name) || isNotValidString(name)){
            res.status(400).json({
                status : 'failed',
                message: '欄位未填寫正確'
             })
            return
        }

        const userRepo = dataSource.getRepository('User')
        const user = await userRepo.findOne({
            where: {
                id
            }
        })

        if (user.name === name){
            res.status(400).json({
                status : 'failed',
                message: '更新使用者失敗'
             })
            return
        }

        const updateResult = await userRepo.update({
            id
        }, {
            name
        })

        if (updateResult.affected === 0) {
            res.status(400).json({
              status: 'failed',
              message: '更新使用者失敗'
            })
            return
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
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

module.exports = router