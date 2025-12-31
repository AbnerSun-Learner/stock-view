import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 密码重置 API 路由
 * 使用 Supabase Admin API 来重置用户密码
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "[reset-password] 缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量，密码重置功能将不可用"
  );
}

export async function POST(req: NextRequest) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "邮箱和新密码不能为空" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要6位字符" },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "服务配置错误，请联系管理员" },
        { status: 500 }
      );
    }

    // 使用 Service Role Key 创建管理员客户端
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 先查找用户
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error("查找用户失败:", listError);
      return NextResponse.json(
        { error: "查找用户失败，请重试" },
        { status: 500 }
      );
    }

    // 查找匹配的用户
    const user = users.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: "该邮箱未注册" },
        { status: 404 }
      );
    }

    // 更新用户密码
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword,
      }
    );

    if (updateError) {
      console.error("更新密码失败:", updateError);
      return NextResponse.json(
        { error: updateError.message || "密码重置失败，请重试" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "密码重置成功",
    });
  } catch (error) {
    console.error("密码重置 API 错误:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}

