import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { defaultCategories } from '../utils/defaultCategories.js';

const signToken = (userId) => 
    jwt.sign({userId}, process.env.JWT_SECRET, {expiresIn: '7d'});

// Register a new user + create default categories + return user data (including token)
    export const register = async (req, res) => {
        const { email, password, name, currency = 'USD'} = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({message: 'All fields required'});
        }

        // Validate email and password
        if (password.length < 6) {
            return res.status(400).json({message: 'Password must be at least 6 characters long'});
        }

        if (!email.includes('@')) {
            return res.status(400).json({message: 'Invalid email'});
        }

        const client = await pool.connect();

        try {
            // Check existing user
            const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
            if(existing.rows.length > 0) {
                return res.status(400).json({message: 'User already exists'});
            }

            await client.query('BEGIN');
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert user + create default categories + create initial budgets + return user data (including token)
            const userResult = await client.query(`
                INSERT INTO users (email, password_hash, name, currency)
                VALUES ($1, $2, $3, $4) RETURNING id, name, email, currency, created_at;
            `, [email, hashedPassword, name, currency]);

            const user = userResult.rows[0];

            // Create default categories
            for (const cat of defaultCategories) {
                await client.query(`
                    INSERT INTO categories (user_id, name, type, icon, color, is_default)
                    VALUES ($1, $2, $3, $4, $5, true)
                `, [user.id, cat.name, cat.type, cat.icon, cat.color]);
            }

            await client.query('COMMIT');

            const token = signToken(user.id);
            res.status(201).json({user, token});

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Register error:',error);
            res.status(500).json({message: 'Internal Server Error'});
        } finally {
            client.release();
        }
    }

    // Login user + generate token
    export const login = async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({message: 'All fields required'});
        }

        try {
            const result = await pool.query('SELECT id, name, email, password_hash, currency FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({message: 'Invalid credentials'});
            }
            const user = result.rows[0];
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({message: 'Invalid credentials'});
            }
            const token = signToken(user.id);
            res.json ({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    currency: user.currency,
                },
                token
            });
        } catch (error) {
            console.error('Login error:',error);
            res.status(500).json({message: 'Internal Server Error'});
        } finally {
            client.release();
        }
    }

    // Get current user profile + token (refetch + regenerate token)
    export const getCurrentUser = async (req, res) => {
        try {
            const userResult = await pool.query('SELECT id, name, email, currency FROM users WHERE id = $1', [req.userId]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({message: 'User not found'});
            }
            const user = userResult.rows[0];
            const token = signToken(user.id);
            res.json({ user, token });
        } catch (error) {
            console.error('Get current user error:',error);
            res.status(500).json({message: 'Internal Server Error'});
        }
    }   
    