import pool from '../db.js';

// Get all categories for user (default + custom)
export const getCategories = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, type, icon, color, is_default 
            FROM categories 
            WHERE user_id = $1 OR is_default = true 
            ORDER BY type, name;`,
            [req.userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({message: 'Internal server error'});
    }
};

// Create a new custom category
export const createCategory = async (req, res) => {
    const {name, type, icon, color} = req.body;

    if (!name || !type) {
        return res.status(400).json({message: 'Name and type required'});
    }

    if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({message: 'Type must be income or expense'});
    }

    try {
        const result = await pool.query(`
            INSERT INTO categories (user_id, name, type, icon, color, is_default)
            VALUES ($1, $2, $3, $4, $5, false) RETURNING *;
        `, [req.userId, name, type, icon || null, color || null]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({message: 'Category already exists'});
        }
        console.error('Create category error:', error);
        res.status(500).json({message: 'Internal Server Error'});
    }
};

// Update a category
export const updateCategory = async (req, res) => {
    const {id} = req.params;
    const {name, icon, color} = req.body;

    try {
        const result = await pool.query(`
            UPDATE categories 
            SET name = COALESCE($1, name),
                icon = COALESCE($2, icon), color = COALESCE($3, color)
            WHERE id = $4 AND user_id = $5 RETURNING *;
        `, [name, icon, color, id, req.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({message: 'Category not found or unauthorized'});
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({message: 'Internal server error'});
    }
};

// Delete a category (only if not default and no transactions)
export const deleteCategory = async (req, res) => {
    const {id} = req.params;

    try {
        const result = await pool.query(`
            DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id;
        `, [id, req.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({message: 'Category not found or unauthorized (or is default)'});
        }

        res.json({message: 'Category deleted successfully'});
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({message: 'Internal server error'});
    }
};

// Batch delete categories (for bulk operations)
export const deleteCategories = async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({message: 'IDs array required'});
    }

    try {
        // Check for transactions first
        const txCheck = await pool.query(`
            SELECT category_id, COUNT(*) 
            FROM transactions 
            WHERE category_id = ANY($1) AND user_id = $2
            GROUP BY category_id`, [ids, req.userId]
        );

        if (txCheck.rows.length > 0) {
            const categoriesWithTx = txCheck.rows.map(r => r.category_id).join(', ');
            return res.status(400).json({
                message: `Cannot delete categories with transactions: ${categoriesWithTx}`
            });
        }

        // Delete non-default categories
        const result = await pool.query(`
            DELETE FROM categories 
            WHERE id = ANY($1) AND user_id = $2 AND is_default = false 
            RETURNING id;
        `, [ids, req.userId]);

        res.json({
            message: `Deleted ${result.rows.length} of ${ids.length} categories`,
            deletedIds: result.rows.map(r => r.id)
        });
    } catch (error) {
        console.error('Delete categories error:', error);
        res.status(500).json({message: 'Internal server error'});
    }
};