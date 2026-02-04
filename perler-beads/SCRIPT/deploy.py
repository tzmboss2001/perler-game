#!/usr/bin/env python3
"""
拼豆工坊 - 前端部署脚本
将构建好的 dist 目录上传到服务器
"""

import paramiko
import os
import stat
from pathlib import Path

# 服务器配置
SERVER_HOST = '119.29.139.249'
SERVER_USER = 'root'
SERVER_PASSWORD = 'Qazwsxedc123!'
SERVER_PORT = 22

# 路径配置
LOCAL_DIST = Path('D:/work/web/perler-beads/dist')
REMOTE_PATH = '/www/wwwroot/perler-beads'

def create_sftp_client():
    """创建 SFTP 客户端"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SERVER_HOST, SERVER_PORT, SERVER_USER, SERVER_PASSWORD)
    sftp = ssh.open_sftp()
    return ssh, sftp

def mkdir_p(sftp, remote_directory):
    """递归创建远程目录"""
    if remote_directory == '/':
        return
    try:
        sftp.stat(remote_directory)
    except FileNotFoundError:
        dirname = os.path.dirname(remote_directory)
        if dirname:
            mkdir_p(sftp, dirname)
        sftp.mkdir(remote_directory)

def upload_directory(sftp, local_path, remote_path):
    """递归上传目录"""
    local_path = Path(local_path)

    # 确保远程目录存在
    mkdir_p(sftp, remote_path)

    for item in local_path.iterdir():
        local_item = str(item)
        remote_item = f"{remote_path}/{item.name}"

        if item.is_dir():
            print(f"创建目录: {remote_item}")
            upload_directory(sftp, local_item, remote_item)
        else:
            print(f"上传文件: {item.name}")
            sftp.put(local_item, remote_item)

def main():
    print("=" * 50)
    print("拼豆工坊 - 前端部署")
    print("=" * 50)

    # 检查本地 dist 目录
    if not LOCAL_DIST.exists():
        print(f"错误: 找不到构建目录 {LOCAL_DIST}")
        print("请先运行: npm run build")
        return

    print(f"\n本地目录: {LOCAL_DIST}")
    print(f"远程目录: {REMOTE_PATH}")
    print(f"服务器: {SERVER_HOST}")

    try:
        # 连接服务器
        print("\n[1/4] 连接服务器...")
        ssh, sftp = create_sftp_client()
        print("[OK] 连接成功")

        # 备份旧文件（可选）
        print("\n[2/4] 清理旧文件...")
        stdin, stdout, stderr = ssh.exec_command(f'rm -rf {REMOTE_PATH}/*')
        stdout.channel.recv_exit_status()
        print("[OK] 清理完成")

        # 上传新文件
        print("\n[3/4] 上传新文件...")
        upload_directory(sftp, LOCAL_DIST, REMOTE_PATH)
        print("[OK] 上传完成")

        # 设置权限
        print("\n[4/4] 设置权限...")
        stdin, stdout, stderr = ssh.exec_command(f'chmod -R 755 {REMOTE_PATH}')
        stdout.channel.recv_exit_status()
        print("[OK] 权限设置完成")

        # 关闭连接
        sftp.close()
        ssh.close()

        print("\n" + "=" * 50)
        print("部署成功！")
        print("=" * 50)
        print(f"\n访问地址: http://{SERVER_HOST}:端口号")
        print("（请在宝塔面板配置 Nginx 站点）")

    except Exception as e:
        print(f"\n错误: {e}")
        raise

if __name__ == '__main__':
    main()
