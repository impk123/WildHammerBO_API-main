const gachaPacketService = require('../services/gachaPacketService');
const { validationResult } = require('express-validator');
const jwtGameUtils = require('../utils/jwtGameUtils');
const backendUserService = require('../services/backendUserSevice');
const sendEmailService = require('../services/sendEmailService');

function getWeightedRandomPacket(packets, options = {}) {
    const {
        requireTotal100 = true,
        tolerance = 0.000001,      // 1e-6 %
        strictPositive = true
    } = options;

    const diags = { totalPercent: '0.0000000', count: 0, invalidItems: [], zeroWeightCount: 0 };

    if (!Array.isArray(packets) || packets.length === 0) {
    return { ok: false, error: 'packets ว่างหรือไม่ใช่อาร์เรย์', diagnostics: diags };
    }

    // ---- helpers ----
    const ONE_E7 = 10000000n;         // สเกล 1e7 (หน่วยต่อ 1%)
    const HUNDRED_INT7 = 100n * ONE_E7;

    function toInt7(val) {
    const s = String(val ?? '').trim();
    if (!s) return 0n;

    // ไม่พึ่งพา parseFloat เพื่อเลี่ยงการปัดเศษลอยตัว
    const m = s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
    if (!m) return 0n;
    const sign = m[1] === '-' ? -1n : 1n;
    let intPart = m[2];
    let fracPart = (m[3] || '');
    
    // ตัด/เติมให้ทศนิยมยาว exactly 7 หลัก
    fracPart = (fracPart + '0000000').slice(0, 7);
    const intVal = BigInt(intPart);
    const fracVal = BigInt(fracPart);
    let scaled = intVal * ONE_E7 + fracVal;
    if (sign < 0n) scaled = -scaled;
    if (scaled < 0n) return 0n; // ไม่อนุญาตค่าติดลบ
    return scaled;
    }

    function randInt(n) {
    if (n <= 0) return 0;
    // ใช้ crypto ถ้ามี (กระจายสม่ำเสมอ)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const max = 0xFFFFFFFF;
        const lim = Math.floor((max + 1) / n) * n;
        const buf = new Uint32Array(1);
        while (true) {
        crypto.getRandomValues(buf);
        const r = buf[0];
        if (r < lim) return r % n;
        }
    }
    // fallback
    return Math.floor(Math.random() * n);
    }

    // ---- เตรียมข้อมูล ----
    const prepared = [];
    let total = 0n;
    let zeroCount = 0;

    packets.forEach((p, idx) => {
    const w = toInt7(p?.prob_rate);
    if (w === 0n) zeroCount++;
    if (w > 0n) {
        prepared.push({ packet: p, w });
        total += w;
    } else if (!String(p?.prob_rate ?? '').trim().match(/^(\d+)(\.\d+)?$/)) {
        diags.invalidItems.push({ index: idx, prob_rate: p?.prob_rate });
    }
    });

    diags.count = packets.length;
    diags.zeroWeightCount = zeroCount;
    // total เปลี่ยนกลับเป็น % เพื่อรายงานผล (ด้วยเลขฐานสิบ)
    diags.totalPercent = (Number(total) / 1e7).toFixed(7);

    // ---- ตรวจสอบความถูกต้อง ----
    if (strictPositive && total === 0n) {
    return { ok: false, error: 'น้ำหนักรวมเป็นศูนย์หรือไม่มีไอเท็มที่ valid (> 0)', diagnostics: diags };
    }

    if (requireTotal100) {
    const tolInt7 = BigInt(Math.round(tolerance * 1e7)); // แปลง tolerance% เป็นสเกล 1e7
    const diff = total > HUNDRED_INT7 ? (total - HUNDRED_INT7) : (HUNDRED_INT7 - total);
    if (diff > tolInt7) {
        return {
        ok: false,
        error: `ผลรวม prob_rate (${diags.totalPercent}%) ไม่อยู่ในช่วง 100% ± ${tolerance}%`,
        diagnostics: diags
        };
    }
    }

    // ---- สุ่ม ----
    // หมายเหตุ: หาก requireTotal100=true total จะ ≈ 1e9 ซึ่งปลอดภัยที่จะ cast เป็น Number
    const totalNumber = Number(total); // <= ~1e12 ยังปลอดภัยใน 53-bit integer range
    const r = BigInt(randInt(totalNumber)); // [0, total-1]
    let acc = 0n;

    for (const { packet, w } of prepared) {
    if (r < acc + w) {
        return { ok: true, packet, diagnostics: diags };
    }
    acc += w;
    }

    // เผื่อขอบ
    return { ok: true, packet: prepared[prepared.length - 1].packet, diagnostics: diags };
}


/**
 * Analyze prob_rate distribution
 * ตรวจสอบการกระจายของ prob_rate และคำนวณเปอร์เซ็นต์
 */
function analyzeProbRates(packets) {
    if (!packets || packets.length === 0) {
        return {
            totalPackets: 0,
            totalProbRate: 0,
            isBalanced: false,
            distribution: [],
            warnings: ['No active packets found']
        };
    }

    const totalProbRate = packets.reduce((sum, packet) => sum + parseFloat(packet.prob_rate), 0);
    const distribution = packets.map(packet => ({
        id: packet.id,
        name: packet.name,
        probRate: parseFloat(packet.prob_rate),
        percentage: parseFloat(packet.prob_rate),
        rarity: packet.item_rarity || 'unknown'
    }));

    // ตรวจสอบความสมดุล
    const isBalanced = Math.abs(totalProbRate - 100) < 0.01; // อนุญาตให้ผิดพลาด 0.01
    const warnings = [];

    if (!isBalanced) {
        warnings.push(`Total prob_rate is ${totalProbRate}%, should be 100%`);
    }

    // ตรวจสอบ prob_rate ที่ต่ำมาก
    const veryLowRates = packets.filter(p => parseFloat(p.prob_rate) < 1);
    if (veryLowRates.length > 0) {
        warnings.push(`${veryLowRates.length} packets have very low prob_rate (< 1%)`);
    }

    // ตรวจสอบ prob_rate ที่สูงมาก
    const veryHighRates = packets.filter(p => parseFloat(p.prob_rate) > 50);
    if (veryHighRates.length > 0) {
        warnings.push(`${veryHighRates.length} packets have very high prob_rate (> 50%)`);
    }

    return {
        totalPackets: packets.length,
        totalProbRate: totalProbRate,
        isBalanced: isBalanced,
        distribution: distribution,
        warnings: warnings,
        recommendations: generateRecommendations(packets, totalProbRate)
    };
}

/**
 * Generate recommendations for prob_rate balancing
 */
function generateRecommendations(packets, totalProbRate) {
    const recommendations = [];

    if (totalProbRate !== 100) {
        const difference = 100 - totalProbRate;
        if (difference > 0) {
            recommendations.push(`Add ${difference.toFixed(2)}% to total prob_rate to reach 100%`);
        } else {
            recommendations.push(`Reduce ${Math.abs(difference).toFixed(2)}% from total prob_rate to reach 100%`);
        }
    }

    // แนะนำการกระจาย prob_rate ตาม rarity
    const rarityGroups = packets.reduce((groups, packet) => {
        const rarity = packet.item_rarity || 'unknown';
        if (!groups[rarity]) {
            groups[rarity] = [];
        }
        groups[rarity].push(packet);
        return groups;
    }, {});

    Object.entries(rarityGroups).forEach(([rarity, rarityPackets]) => {
        const totalRarityRate = rarityPackets.reduce((sum, p) => sum + parseFloat(p.prob_rate), 0);
        const avgRate = totalRarityRate / rarityPackets.length;
        
        if (rarity === 'legendary' && avgRate > 5) {
            recommendations.push(`Consider reducing legendary rates (currently ${avgRate.toFixed(2)}% average)`);
        } else if (rarity === 'common' && avgRate < 20) {
            recommendations.push(`Consider increasing common rates (currently ${avgRate.toFixed(2)}% average)`);
        }
    });

    return recommendations;
}

/**
 * Test weighted random distribution (Admin only)
 * GET /api/gacha-packets/test-random?iterations=1000
 */
const testWeightedRandom = async (req, res) => {
    try {
        const iterations = parseInt(req.query.iterations) || 1000;
        
        if (iterations > 100000) {
            return res.status(400).json({
                success: false,
                message: 'Maximum iterations allowed is 10000'
            });
        }

        const activePackets = await gachaPacketService.getActivePackets();
        if (!activePackets || activePackets.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No active gacha packets found'
            });
        }

        // ทดสอบ weighted random
        const results = {};
        const totalProbRate = activePackets.reduce((sum, packet) => sum + parseFloat(packet.prob_rate), 0);

        // เริ่มต้น counter
        activePackets.forEach(packet => {
            results[packet.id] = {
                name: packet.name,
                expectedRate: parseFloat(packet.prob_rate),
                actualCount: 0,
                actualRate: 0
            };
        });

        // ทำการสุ่ม
        for (let i = 0; i < iterations; i++) {
            const randomPacket = getWeightedRandomPacket(activePackets,{
                requireTotal100: true,   // บังคับให้ sum ≈ 100%
                tolerance: 0.000001,     // ยอมคลาดเคลื่อน 0.000001%
                strictPositive: true
              });
            //return { ok: true, packet: prepared[prepared.length - 1].packet, diagnostics: diags };
            if (randomPacket.ok && randomPacket.packet) {
                results[randomPacket.packet.id].actualCount++;
            }
            else
            {
                console.error('Error random:', randomPacket.diagnostics);                
            }
        }

        res.json({
            success: true,
            data: {
                testSettings: {
                    iterations: iterations,
                    totalPackets: activePackets.length,
                    totalProbRate: totalProbRate,
                    isBalanced: Math.abs(totalProbRate - 100) < 0.01
                },
                results: results,                
            }
        });

    } catch (error) {
        console.error('Error testing weighted random:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test weighted random'
        });
    }
};

/**
 * Get all gacha packets with pagination and filters
 * GET /api/gacha-packets
 */
const getAllPackets = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            is_active,
            is_equipment,
            name
        } = req.query;

        const filters = {};
        
        if (is_active !== undefined) {
            filters.is_active = parseInt(is_active);
        }
        
        if (is_equipment !== undefined) {
            filters.is_equipment = parseInt(is_equipment);
        }
        
        if (name) {
            filters.name = name;
        }

        const packets = await gachaPacketService.getAllPackets(
            parseInt(page), 
            parseInt(limit), 
            filters
        );

        res.json({
            success: true,
            data: {
                packets,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: packets.length
                }
            }
        });

    } catch (error) {
        console.error('Error getting gacha packets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get gacha packets'
        });
    }
};

/**
 * Get single gacha packet by ID
 * GET /api/gacha-packets/:id
 */
const getPacketById = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const packet = await gachaPacketService.getPacketById(packetId);

        if (!packet) {
            return res.status(404).json({
                success: false,
                message: 'Gacha packet not found'
            });
        }

        res.json({
            success: true,
            data: packet
        });

    } catch (error) {
        console.error('Error getting gacha packet by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get gacha packet'
        });
    }
};

/**
 * Create new gacha packet (Admin only)
 * POST /api/gacha-packets
 */
const createPacket = async (req, res) => {
    try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const result = await gachaPacketService.createPacket(req.body);

        if (result.success) {
            const newPacket = await gachaPacketService.getPacketById(result.data.id);
            res.status(201).json({
                success: true,
                message: result.message,
                data: newPacket
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error creating gacha packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create gacha packet'
        });
    }
};

/**
 * Update gacha packet (Admin only)
 * PUT /api/gacha-packets/:id
 */
const updatePacket = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await gachaPacketService.updatePacket(packetId, req.body);

        if (result.success) {
            const updatedPacket = await gachaPacketService.getPacketById(packetId);
            res.json({
                success: true,
                message: result.message,
                data: updatedPacket
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error updating gacha packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update gacha packet'
        });
    }
};

/**
 * Delete gacha packet (Admin only)
 * DELETE /api/gacha-packets/:id
 */
const deletePacket = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await gachaPacketService.deletePacket(packetId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error deleting gacha packet:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete gacha packet'
        });
    }
};

/**
 * Get active gacha packets for game
 * GET /api/gacha-packets/active
 */
const getActivePackets = async (req, res) => {
    try {
        
        const token = req.query.token||'';        
        
        if(token==''){
            return res.status(400).json({
                success: false,
                message: 'Invalid token, username or serverid'
            });
        }

        //decode token
        const decoded = jwtGameUtils.decodeGameToken(token);
        const roleId = decoded.id;
        const userid = decoded.userid || '';
        const serverid = decoded.serverid || 0;

        if(userid=='' || serverid==0){
            return res.status(400).json({
                success: false,
                message: 'Invalid username or userid'
            });
        }

        // check expire
        if(decoded.exp < Date.now()/1000){
            return res.status(400).json({
                success: false,
                message: 'Token expired'
            });
        }

        //get active packets
        const activePackets = await gachaPacketService.getActivePackets();        

        // เพิ่มการดึง gachaCost
        const gachaCost = await gachaPacketService.getGachaCost();

        res.json({
            success: true,
            data: {
                active_packets: activePackets,
                total: activePackets.length,
                gacha_cost: gachaCost
            }
        });

    } catch (error) {
        console.error('Error getting active gacha packets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active gacha packets'
        });
    }
};

const buyGachaPacket = async (req, res) => {
    try {
        
        const token = req.body.token||'';   
        const num = req.query.num||1;

        let packetId = 0;
        
        if(token==''){
            return res.status(400).json({
                success: false,
                message: 'Invalid token, username or serverid'
            });
        }
    
        //decode token
        const decoded = jwtGameUtils.decodeGameToken(token);
        const roleId = decoded.id;
        const userid = decoded.userid || '';
        const serverid = decoded.serverid || 0;

        

        if(userid=='' || serverid==0){
            return res.status(400).json({
                success: false,
                message: 'Invalid username or userid'
            });
        }

        // check expire
        if(decoded.exp < Date.now()/1000){
            return res.status(400).json({
                success: false,
                message: 'Token expired'
            });
        }

        //get active packets
        const gachaActivePackets = await gachaPacketService.getActivePackets();
        if(gachaActivePackets==null || gachaActivePackets.length==0){
            return res.status(400).json({
                success: false,
                message: 'Gacha active packets not found'
            });
        }

        //get realMoney from user
        const userBackendData = await backendUserService.getUsersById(serverid,userid);

        if(userBackendData==null){
            return res.status(400).json({
                success: false,
                message: 'UserBackend not found'
            });
        }

        const gachaCost = await gachaPacketService.getGachaCost()*num;
        
        if(gachaCost==null || gachaCost==0){
            return res.status(400).json({
                success: false,
                message: 'Gacha cost not found'
            });
        }

        const userData = userBackendData[0];
        if(userData.realMoney==null || userData.realMoney==undefined){
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }
        
        if(userData.realMoney<gachaCost){
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        const resultReduceMoney = await backendUserService.reduceRealmoney(serverid,userid,gachaCost);
        if(resultReduceMoney.affectedRows==0){
            return res.status(400).json({
                success: false,
                message: 'Failed to reduce money'
            });
        }

        //insert history
        const resultInsertHistory = await gachaPacketService.insertHistory(serverid,userid,roleId,gachaCost,packetId);
        if(resultInsertHistory.success==false){
            return res.status(400).json({
                success: false,
                message: 'Failed to insert history'
            });
        }

        //Random gachaActivePackets use prob_rate (weighted random)
        let listRandomPacket = [];

        for(let i=0;i<num;i++){
            const randomPacket = getWeightedRandomPacket(gachaActivePackets,{
                requireTotal100: true,   // บังคับให้ sum ≈ 100%
                tolerance: 0.000001,     // ยอมคลาดเคลื่อน 0.000001%
                strictPositive: true
              });

            if(randomPacket.ok && randomPacket.packet){
                packetId = randomPacket.packet.id;
                const items = randomPacket.packet.item.items;
                const gameItemsFormat = sendEmailService.convertGachaItemsToGameFormat(items);       
                const sendEmail = await sendEmailService.sendGachaEmail('กาชาไอเท็ม','กดเพื่อรับรางวัล',serverid,roleId, gameItemsFormat);

                if(sendEmail.success==false){
                    //refund money
                    const resultRefundMoney = await backendUserService.refundRealmoney(serverid,userid,gachaCost);            
                    return res.status(400).json({
                        success: false,
                        message: 'Failed to send mail gacha'
                    });
                }
                
                const resultUpdateHistorySendEmail = await gachaPacketService.updateHistorySendEmail(resultInsertHistory.data.id,1,'');
                if(resultUpdateHistorySendEmail.success==false){
                    return res.status(400).json({
                        success: false,
                        message: 'Failed to update history send email'
                    });
                }

            }
            else
            {
                console.error('Error random:', randomPacket.diagnostics);
                return res.status(400).json({
                    success: false,
                    message: 'Error random:'+ randomPacket.diagnostics,
                });
            }

            listRandomPacket.push(randomPacket.packet);
        }

        const resultUpdateHistory = await gachaPacketService.updateHistory(resultInsertHistory.data.id,listRandomPacket);        
        
        res.json({
            success: true,
            data: {
                items : listRandomPacket
            }
        });

    } catch (error) {
        console.error('Error getting active gacha packets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active gacha packets'
        });
    }
};

const getGachaHistory = async (req, res) => {
    try {
            const token = req.query.token||'';   
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            if(token==''){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid token, username or serverid'
                });
            }

            //decode token
            const decoded = jwtGameUtils.decodeGameToken(token);
            const roleId = decoded.id;
            const userid = decoded.userid || '';
            const serverid = decoded.serverid || 0;       

            if(roleId=='' || userid=='' || serverid==0){
                return res.status(400).json({
                    success: false,
                    message: 'Invalid username or userid'
                });
            }

            // check expire
            if(decoded.exp < Date.now()/1000){
                return res.status(400).json({
                    success: false,
                    message: 'Token expired'
                });
            }
            const history = await gachaPacketService.getGachaHistory(roleId, offset, limit);
            res.json({
                success: true,
                data: history,
                roleId: roleId
            });
    } catch (error) {
        console.error('Error getting gacha history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get gacha history'
        });
    }
};

const getStatistics = async (req, res) => {
    try {
        const statistics = await gachaPacketService.getStatistics();
        
        // เพิ่มข้อมูล prob_rate analysis
        const activePackets = await gachaPacketService.getActivePackets();
        const probRateAnalysis = analyzeProbRates(activePackets);

        res.json({
            success: true,
            data: {
                statistics,
                probRateAnalysis
            }
        });

    } catch (error) {
        console.error('Error getting gacha packet statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get gacha packet statistics'
        });
    }
};

/**
 * Toggle packet active status (Admin only)
 * PATCH /api/gacha-packets/:id/toggle-active
 */
const toggleActiveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await gachaPacketService.toggleActiveStatus(packetId);

        if (result.success) {
            const updatedPacket = await gachaPacketService.getPacketById(packetId);
            res.json({
                success: true,
                message: 'Packet status toggled successfully',
                data: updatedPacket
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error toggling packet status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle packet status'
        });
    }
};

/**
 * Toggle packet equipment status (Admin only)
 * PATCH /api/gacha-packets/:id/toggle-equipment
 */
const toggleEquipmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const packetId = parseInt(id, 10);

        if (isNaN(packetId) || packetId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid packet ID'
            });
        }

        const result = await gachaPacketService.toggleEquipmentStatus(packetId);

        if (result.success) {
            const updatedPacket = await gachaPacketService.getPacketById(packetId);
            res.json({
                success: true,
                message: 'Packet equipment status toggled successfully',
                data: updatedPacket
            });
        } else {
            res.status(404).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error toggling equipment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle equipment status'
        });
    }
};

module.exports = {
    getAllPackets,
    getPacketById,
    createPacket,
    updatePacket,
    deletePacket,
    getActivePackets,
    getStatistics,
    testWeightedRandom,
    toggleActiveStatus,
    toggleEquipmentStatus,
    buyGachaPacket,
    getGachaHistory

};
