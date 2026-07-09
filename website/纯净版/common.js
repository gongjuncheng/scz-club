// =====================================================
// 孙春志官方后援会 · 公共工具函数
// 所有 HTML 页面通过 <script src="common.js"></script> 引入
// =====================================================

/**
 * 生成分享链接并复制到剪贴板
 * @param {string} type - 内容类型 (goodie/meme/post/case/outfit)
 * @param {string|number} id - 内容ID
 */
function shareItem(type, id) {
  const url = `https://scz.14514.top/share.html?type=${type}&id=${id}`;
  navigator.clipboard.writeText(url)
    .then(() => alert('分享链接已复制！'))
    .catch(() => prompt('复制以下链接分享：', url));
}

/**
 * HTML 转义，防止 XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[c]);
}

/**
 * 违禁词检测 + 违规记录（通用函数）
 * @param {object} supabase - Supabase 客户端
 * @param {object} user - 当前用户 { id, email... }，未登录则为 null
 * @param {string} contentText - 要检测的文本
 * @param {string} contentType - 内容类型 (post/comment/outfit/goodie/meme)
 * @returns {boolean} true 表示有违规（已阻止），false 表示通过
 */
async function checkAndHandleViolation(supabase, user, contentText, contentType) {
  // 未登录用户不检测，但一般发布页面已要求登录，此处做兜底
  if (!user) return false;

  try {
    // 1. 检测违禁词
    const { data: matchedWords, error } = await supabase.rpc('check_banned_words', {
      content_text: contentText
    });

    if (error) {
      console.error('违禁词检测失败:', error);
      return false; // 检测失败时放行（避免误拦）
    }

    if (matchedWords && matchedWords.length > 0) {
      const wordList = matchedWords.map(w => w.matched_word).join('、');

      // 2. 记录违规并触发自动封号逻辑
      const { error: violationError } = await supabase.rpc('handle_violation', {
        p_user_id: user.id,
        p_content_type: contentType,
        p_content_id: 0,  // 还没发布，传 0
        p_matched_word: wordList
      });

      if (violationError) {
        console.error('违规记录失败:', violationError);
      }

      // 3. 提示用户
      alert(`⚠️ 内容包含违禁词：${wordList}\n发布已被阻止，违规已记录。多次违规将导致封号。`);
      return true; // 有违规，阻止发布
    }
  } catch (e) {
    console.error('违禁词检测异常:', e);
  }

  return false; // 无违规
}