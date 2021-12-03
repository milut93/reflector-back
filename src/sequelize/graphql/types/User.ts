import {
    Field,
    InputType
}                        from 'type-graphql'
import {IsNoBlankInWord} from '../validations'
import {
    Length
}                        from 'class-validator'
import {GraphQLUpload} from 'apollo-server-express'
import {Stream}           from 'stream'


export type UploadType = {
    filename: string
    mimetype: string
    encoding: string
    createReadStream: ()=> Stream
}


@InputType({isAbstract: true})
export class UserType {

    @Field({nullable: true})
    @Length(4, 63)
    @IsNoBlankInWord({message: 'User Name must be with out blanks'})
    userName: string

    @Field({nullable: true})
    @Length(1, 63)
    @IsNoBlankInWord({message: 'Nickname must be with out blanks'})
    nickname: string

    @Field({nullable: true})
    description: string

    @Field(type => GraphQLUpload,{nullable:true})
    image: UploadType


    @Field({nullable: true})
    @Length(4, 63)
    password: string
}

@InputType({isAbstract: true})
export class UserChangePasswordType {
    @Field()
    @Length(4, 63)
    password: string

    @Field()
    @Length(4, 63)
    currentPassword: string
}


@InputType({isAbstract: true})
export class ChangePasswordLinkType {
    @Field()
    @Length(4, 63)
    password: string

    @Field()
    key: string
}

