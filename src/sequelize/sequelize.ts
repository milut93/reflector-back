import 'reflect-metadata'
import { buildSchemaSync } from 'type-graphql'
import { Sequelize, SequelizeOptions } from 'sequelize-typescript'
import settings from '../../config/index'
import resolvers from './graphql/resolvers'

// eslint-disable-next-line no-void
let sequelize = void(0)

export const initSequelize = async (env?: string, drop?: boolean) => {
  const config = env || 'local'
  const options = {
    ...settings.sequelizeSettings[config],
    ...{
      underscored: true,
      // eslint-disable-next-line node/no-path-concat
      modelPaths: [__dirname + '/**/*.model.ts'],
      // eslint-disable-next-line node/no-path-concat
      migrationsPaths: [__dirname + '/**/*.migration.ts']
    }
  }
  sequelize = new Sequelize(options as SequelizeOptions)
  await sequelize.sync({ force: !!drop })
}
export const createSchemaGraphQL = () => buildSchemaSync({
  resolvers: resolvers as any
})

export {
  sequelize
}
