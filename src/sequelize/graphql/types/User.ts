import { Field, InputType } from 'type-graphql'
import { IsNoBlankInWord } from '../validations'
import { IsEmail, Length } from 'class-validator'

@InputType({ isAbstract: true })
export class UserType {
    @Field({ nullable: true })
    @Length(4, 63)
    @IsNoBlankInWord({ message: 'User Name must be with out blanks' })
      userName: string

    @Field({ nullable: true })
    @Length(1, 63)
    @IsEmail()
      email: string

    @Field({ nullable: true })
    @Length(4, 63)
      password: string
}

@InputType({ isAbstract: true })
export class UserChangePasswordType {
    @Field()
    @Length(4, 63)
      password: string

    @Field()
    @Length(4, 63)
      currentPassword: string
}

@InputType({ isAbstract: true })
export class ChangePasswordLinkType {
    @Field()
    @Length(4, 63)
      password: string

    @Field()
      key: string
}

