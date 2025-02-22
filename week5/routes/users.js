const express = require('express')
const bcrypt = require('bcrypt')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('User')
const { isUndefined, isNotValidString, isNotValidUUID, isNotValidInteger, isValidPassword } = require('../utils/validUtils')

const saltRounds = 10

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
        const hashPassword = await bcrypt.hash(password, saltRounds)
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

module.exports = router