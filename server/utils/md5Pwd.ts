import utils from 'utility'

export default function md5Pwd(pwd: string) {
  const salt = 'cecil_study_always_@$%@'
  return utils.md5(utils.md5(pwd + salt))
}
