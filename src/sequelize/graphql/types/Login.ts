import {
    Field,
    InputType, ObjectType
} from 'type-graphql'
import {
    IsNoBlankInWord,
} from '../validations'
import {
    Length
} from 'class-validator'

@InputType({ isAbstract: true })
export class LoginType {

    @Field({ nullable: true })
    @IsNoBlankInWord({ message: 'User Name must be with out blanks' })
    userName: string

    @Field({ nullable: true })
    @IsNoBlankInWord({ message: 'Nickname must be with out blanks' })
    nickname: string

    @Field()
    @Length(4, 63)
    // @IsPasswordValid({message: 'Password is not valid'})
    password: string

}

@ObjectType('loginTokens')
export class LoginResponseType {

    @Field(type => String)
    token: string

    @Field(type => String)
    refresh: string

    @Field(type => String)
    refreshTime: string
}
