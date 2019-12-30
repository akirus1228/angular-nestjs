import { Entity } from '../../Entity';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ActionType } from '../enum';

export class ContactField extends Entity {
    @IsString()
    property: string;
    @IsOptional()
    @IsString()
    title?: string;
    @IsOptional()
    @IsNumber()
    index?: number;
    @IsOptional()
    @IsNumber()
    length?: number;
}

export enum FieldType {
    text,
    list,
    yesNo,
    timer,
}
export class SettingField extends Entity {
    @IsOptional()
    @IsNumber()
    length?: number;

    @IsOptional()
    @IsNumber()
    index?: number;

    @IsEnum(FieldType)
    type: FieldType;

    @IsOptional()
    @ValidateNested()
    options?: Function;

    @IsOptional()
    value?: any;
}
export class Settings extends Entity {
    @IsString()
    name: string;
    @ValidateNested({ each: true })
    fields: SettingField[];
    @IsOptional()
    @IsNumber()
    index?: number;
    @IsOptional()
    @IsNumber()
    length?: number;
    constructor(settings: Partial<Settings>) {
        super(settings);
        this.fields = this.fields.map(f => new SettingField(f));
    }
}
export class Contacts extends Entity {
    @IsOptional()
    @IsNumber()
    index?: number;
    @ValidateNested({ each: true })
    contactFields: ContactField[];
    @IsNumber()
    count: number;

    @IsArray()
    list?: any[];
    constructor(contacts: Partial<Contacts>) {
        super(contacts);
        this.contactFields = this.contactFields.map(f => new ContactField(f));
        if (!this.list) {
            this.list = new Array(this.count).fill(1).map((_, i) => {
                return this.contactFields.reduce(
                    item => {
                        // item[field.property] = field.defualt;
                        return item;
                    },
                    { id: i + 1 },
                );
            });
        }
    }
}
export class Panel extends Entity {
    @IsOptional()
    @IsEnum(ActionType)
    actionType?: ActionType;
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsString()
    panelId: string;
    @IsNumber()
    maxEEprom: number;
    @IsString()
    type: string;
    @IsNumber()
    version: number;
    @ValidateNested()
    contacts: Contacts;
    @ValidateNested({ each: true })
    settings: Settings[];
    @IsString()
    userId: string;
    @IsString()
    @IsOptional()
    address?: string;
    constructor(panel?: Partial<Panel>) {
        super(panel);
        this.contacts = new Contacts(panel.contacts);
        this.settings = panel.settings.map(s => new Settings(s));

        // if (this.constructor.name === 'Panel') return new panels[panel.type](panel);
    }
    dump() {
        const arr = new Array(this.maxEEprom).fill(' ');
        this.contacts.contactFields.forEach(field => {
            const fieldLength = field.length;
            const index = field.index;
            const all = this.contacts.list
                .map(c =>
                    (c[field.property] ? c[field.property] + ' '.repeat(fieldLength) : ' '.repeat(fieldLength)).slice(
                        0,
                        fieldLength,
                    ),
                )
                .join('');
            all.split('').forEach((c, i) => {
                arr[index + i] = c;
            });
        });

        this.settings.forEach(s => {
            s.fields.forEach((f, i) => {
                if (!f.value) return;
                const value: string =
                    f.type == FieldType.timer
                        ? f.value.day + f.value.from.replace(':', '') + f.value.to.replace(':', '')
                        : f.value.toString();

                const jInit = f.index || s.index + i * s.length;
                for (let j = 0; j < (f.length || s.length); j++) {
                    arr[jInit + j] = value[j] || ' ';
                }
            });
        });
        return arr.join('');
    }
    reDump(dump: string) {
        this.contacts.contactFields.forEach(field => {
            const fieldLength = field.length;
            const index = field.index;
            this.contacts.list.forEach((item, i) => {
                const start = index + i * fieldLength;
                const end = start + fieldLength;
                item[field.property] = dump.slice(start, end).trim();
            });
        });

        this.settings.forEach(s => {
            s.fields.forEach((f, i) => {
                let value = '';
                const jInit = f.index || s.index + i * s.length;
                for (let j = 0; j < (f.length || s.length); j++) {
                    value += dump[jInit + j];
                }
                f.value =
                    f.type != FieldType.timer
                        ? value
                        : {
                              day: value.slice(0, 7),
                              from: value.slice(7, 9) + ':' + value.slice(9, 11),
                              to: value.slice(11, 13) + ':' + value.slice(13, 15),
                          };
            });
        });
    }
}
